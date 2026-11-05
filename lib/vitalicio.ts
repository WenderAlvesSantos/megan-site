import { gerarChave, type NovaChave } from './chave.js'
import type { EmailVitalicio } from './emailVitalicio.js'
import type { ContaGerenciador } from './gerenciador.js'
import type { EventoLicenca, UsuarioMegan } from './mongo.js'
import { PLANO_VITALICIO } from './plano.js'

export interface DepsVitalicio {
  agora: () => Date
  buscarUsuario: (email: string) => Promise<UsuarioMegan | null>
  /** Plano vitalício, ativo e sem limite de contratos; grava a chave nova se houver. */
  liberar: (email: string, chave: NovaChave | null, agora: Date) => Promise<void>
  criarContaGerenciador: (email: string) => Promise<ContaGerenciador>
  enviarEmail: (d: EmailVitalicio) => Promise<void>
  evento: (e: Omit<EventoLicenca, 'em'>) => Promise<void>
}

export type ResultadoVitalicio =
  | { ok: true; chave: string | null; gerenciador: 'criada' | 'existente' | 'falhou'; emailEnviado: boolean }
  | { ok: false; mensagem: string }

/** Suporte libera Megan + trade-manager sem pagamento; o trade-manager reconhece o plano pela consulta de licença. */
export async function liberarVitalicio(email: string, deps: DepsVitalicio): Promise<ResultadoVitalicio> {
  const u = await deps.buscarUsuario(email)
  if (!u) return { ok: false, mensagem: 'Cliente não encontrado.' }
  if (u.active && u.plan === PLANO_VITALICIO) return { ok: false, mensagem: 'Este cliente já tem acesso vitalício.' }

  // Quem já tem chave continua com ela (e com o computador já vinculado)
  const chave = u.licenseKeyHash ? null : gerarChave()
  await deps.liberar(u.email, chave, deps.agora())
  await deps.evento({ email: u.email, tipo: 'vitalicio', detalhe: 'suporte' })
  if (chave) await deps.evento({ email: u.email, tipo: 'chave_gerada', detalhe: 'vitalicio' })

  const conta = await deps.criarContaGerenciador(u.email).catch((e) => {
    console.error('[admin] vitalício gerenciador', u.email, e)
    return undefined
  })
  let emailEnviado = true
  await deps.enviarEmail({ para: u.email, nome: u.name, conta, chave: chave?.chave ?? null }).catch((e) => {
    emailEnviado = false
    console.error('[admin] vitalício e-mail', u.email, e)
  })
  const gerenciador = !conta ? 'falhou' : conta.senha === null ? 'existente' : 'criada'
  return { ok: true, chave: chave?.chave ?? null, gerenciador, emailEnviado }
}
