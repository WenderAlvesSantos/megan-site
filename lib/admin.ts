import { createHash, timingSafeEqual } from 'node:crypto'
import { camposNovaChave } from './ativacao.js'
import { gerarChave } from './chave.js'
import type { EmailChave, MotivoChave } from './emailChave.js'
import type { ResultadoConfigGerenciador } from './gerenciador.js'
import { avaliarLicenca } from './licenca.js'
import type { CompraMegan, EventoLicenca, UsuarioMegan } from './mongo.js'
import { fimDoArrependimento, podeReembolsar } from './reembolso.js'
import { statusCliente, type StatusCliente } from './statusCliente.js'

export function adminAutorizado(cabecalho: string, senha: string): boolean {
  const h = (v: string) => createHash('sha256').update(v).digest()
  return timingSafeEqual(h(cabecalho), h(`Bearer ${senha}`))
}

/** Linha da listagem: só o essencial; os detalhes vêm ao abrir o cliente. */
export interface ClienteLinha {
  nome: string
  email: string
  status: StatusCliente
}

export interface ClienteAdmin extends ClienteLinha {
  telefone: string
  plano: string
  ativo: boolean
  liberado: boolean
  contratos: number
  venceEm: string | null
  cadastradoEm: string | null
  origem: string
  chaveFinal: string | null
  chaveGeradaEm: string | null
  vinculadaEm: string | null
  ultimaConsulta: string | null
  gerenciadorConfigEm: string | null
  compra: CompraResumo | null
  eventos: { tipo: string; em: string; detalhe?: string }[]
}

/** Última compra paga: valor, prazo de arrependimento (7 dias) e se o suporte ainda pode reembolsar. */
export interface CompraResumo {
  valor: number
  pagaEm: string
  arrependimentoAte: string
  podeReembolsar: boolean
  reembolsadaEm: string | null
  reembolsoOrigem: string | null
}

export function resumoCompra(c: CompraMegan | null, agora: Date): CompraResumo | null {
  if (!c?.aplicadaEm) return null
  return {
    valor: Number(c.valor) || 0,
    pagaEm: new Date(c.aplicadaEm).toISOString(),
    arrependimentoAte: (fimDoArrependimento(c) as Date).toISOString(),
    podeReembolsar: podeReembolsar(c, agora),
    reembolsadaEm: iso(c.reembolsadaEm),
    reembolsoOrigem: c.reembolsoOrigem ?? null,
  }
}

const iso = (d?: Date | null) => (d ? new Date(d).toISOString() : null)

export const linhaCliente = (u: UsuarioMegan, agora: Date): ClienteLinha => ({
  nome: u.name,
  email: u.email,
  status: statusCliente(u, agora),
})

export function resumoCliente(
  u: UsuarioMegan,
  eventos: EventoLicenca[],
  agora: Date,
  compra: CompraMegan | null = null,
): ClienteAdmin {
  const lic = avaliarLicenca(u, agora)
  return {
    ...linhaCliente(u, agora),
    telefone: u.phone ?? '',
    plano: u.plan || 'licenca',
    ativo: u.active,
    liberado: lic.ok,
    contratos: lic.ok ? lic.contratos : Math.max(0, Number(u.contract) || 0),
    venceEm: lic.venceEm,
    cadastradoEm: iso(u.createdAt),
    origem: u.source ?? '',
    gerenciadorConfigEm: iso(u.gerenciadorConfigAt),
    compra: resumoCompra(compra, agora),
    chaveFinal: u.licenseKeyHint ?? null,
    chaveGeradaEm: iso(u.licenseKeyCreatedAt),
    vinculadaEm: u.machineId ? iso(u.machineBoundAt) ?? '' : null,
    ultimaConsulta: iso(u.lastCheckAt),
    eventos: eventos
      .filter((e) => e.email === u.email)
      .slice(0, 5)
      .map((e) => ({ tipo: e.tipo, em: new Date(e.em).toISOString(), detalhe: e.detalhe })),
  }
}

/** Quem deve receber chave na migração: ativo e com acesso ainda válido. */
export function precisaChave(u: UsuarioMegan, agora: Date): boolean {
  return !u.licenseKeyHash && avaliarLicenca(u, agora).ok
}

export interface DepsAdmin {
  agora: () => Date
  buscarUsuario: (email: string) => Promise<UsuarioMegan | null>
  /** Grava a chave nova e libera a máquina (a chave anterior deixa de valer). */
  trocarChave: (email: string, campos: ReturnType<typeof camposNovaChave>) => Promise<void>
  semChave: () => Promise<UsuarioMegan[]>
  enviarEmailChave: (d: EmailChave) => Promise<void>
  evento: (e: Omit<EventoLicenca, 'em'>) => Promise<void>
}

export type ResultadoNovaChave =
  | { ok: true; chave: string; emailEnviado: boolean }
  | { ok: false; mensagem: string }

export async function emitirNovaChave(email: string, motivo: MotivoChave, deps: DepsAdmin): Promise<ResultadoNovaChave> {
  const u = await deps.buscarUsuario(email)
  if (!u) return { ok: false, mensagem: 'Cliente não encontrado.' }
  const nova = gerarChave()
  await deps.trocarChave(u.email, camposNovaChave(nova, deps.agora()))
  await deps.evento({ email: u.email, tipo: 'chave_gerada', detalhe: motivo === 'troca' ? 'suporte' : 'migracao' })
  let emailEnviado = true
  try {
    await deps.enviarEmailChave({ para: u.email, nome: u.name, chave: nova.chave, motivo })
  } catch (e) {
    emailEnviado = false
    console.error('[admin] e-mail da chave', u.email, e)
  }
  return { ok: true, chave: nova.chave, emailEnviado }
}

export const LOTE_MIGRACAO = 25

export interface DepsConfigGerenciador {
  /** Clientes ainda não passados pela rotina (sem `gerenciadorConfigAt`), até `limite`. */
  pendentes: (limite: number) => Promise<string[]>
  contarPendentes: () => Promise<number>
  configurar: (emails: string[], sobrescrever?: boolean) => Promise<ResultadoConfigGerenciador>
  marcar: (emails: string[]) => Promise<void>
}

export interface ResumoConfigGerenciador {
  aplicados: number
  jaTinham: number
  semConta: string[]
  restantes: number
}

export type ResultadoConfigCliente = { status: 'aplicado' | 'ja_tinha' | 'sem_conta' }

/** Um cliente: aplica a configuração da Megan no Real e no Simulador (também sobre a existente) e marca como feito. */
export async function configurarGerenciadorCliente(
  email: string,
  deps: Pick<DepsConfigGerenciador, 'configurar' | 'marcar'>,
): Promise<ResultadoConfigCliente> {
  const r = await deps.configurar([email], true)
  await deps.marcar([email])
  if (r.aplicados.includes(email)) return { status: 'aplicado' }
  return { status: r.semConta.includes(email) ? 'sem_conta' : 'ja_tinha' }
}

/** Clientes antigos, um lote por chamada: cria a configuração da Megan no trade-manager de quem ainda não tem. */
export async function aplicarConfigGerenciador(deps: DepsConfigGerenciador): Promise<ResumoConfigGerenciador> {
  const lote = await deps.pendentes(LOTE_MIGRACAO)
  if (lote.length === 0) return { aplicados: 0, jaTinham: 0, semConta: [], restantes: 0 }
  const r = await deps.configurar(lote)
  // Sem conta no gerenciador também sai da fila: ao criar a conta ela já nasce configurada.
  await deps.marcar(lote)
  return { aplicados: r.aplicados.length, jaTinham: r.jaTinham.length, semConta: r.semConta, restantes: await deps.contarPendentes() }
}

/** Um lote por chamada (limite de tempo da função); a página repete enquanto houver `restantes`. */
export async function gerarChavesFaltantes(
  deps: DepsAdmin,
): Promise<{ geradas: number; restantes: number; semEmail: string[] }> {
  const agora = deps.agora()
  const pendentes = (await deps.semChave()).filter((u) => precisaChave(u, agora))
  const lote = pendentes.slice(0, LOTE_MIGRACAO)
  const semEmail: string[] = []
  for (const u of lote) {
    const r = await emitirNovaChave(u.email, 'migracao', deps)
    if (r.ok && !r.emailEnviado) semEmail.push(u.email)
  }
  return { geradas: lote.length, restantes: pendentes.length - lote.length, semEmail }
}
