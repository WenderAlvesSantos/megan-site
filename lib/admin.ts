import { createHash, timingSafeEqual } from 'node:crypto'
import { camposNovaChave } from './ativacao.js'
import { gerarChave } from './chave.js'
import type { EmailChave, MotivoChave } from './emailChave.js'
import type { ResultadoConfigGerenciador } from './gerenciador.js'
import { avaliarLicenca } from './licenca.js'
import type { EventoLicenca, UsuarioMegan } from './mongo.js'

export function adminAutorizado(cabecalho: string, senha: string): boolean {
  const h = (v: string) => createHash('sha256').update(v).digest()
  return timingSafeEqual(h(cabecalho), h(`Bearer ${senha}`))
}

export interface ClienteAdmin {
  nome: string
  email: string
  telefone: string
  plano: string
  ativo: boolean
  liberado: boolean
  venceEm: string | null
  chaveFinal: string | null
  chaveGeradaEm: string | null
  vinculadaEm: string | null
  ultimaConsulta: string | null
  eventos: { tipo: string; em: string; detalhe?: string }[]
}

const iso = (d?: Date | null) => (d ? new Date(d).toISOString() : null)

export function resumoCliente(u: UsuarioMegan, eventos: EventoLicenca[], agora: Date): ClienteAdmin {
  const lic = avaliarLicenca(u, agora)
  return {
    nome: u.name,
    email: u.email,
    telefone: u.phone ?? '',
    plano: u.plan || 'licenca',
    ativo: u.active,
    liberado: lic.ok,
    venceEm: lic.venceEm,
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
  configurar: (emails: string[]) => Promise<ResultadoConfigGerenciador>
  marcar: (emails: string[]) => Promise<void>
}

export interface ResumoConfigGerenciador {
  aplicados: number
  jaTinham: number
  semConta: string[]
  restantes: number
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
