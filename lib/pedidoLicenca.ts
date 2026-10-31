import { verificarAtivacao, type MotivoRecusa } from './ativacao.js'
import { avaliarLicenca, type ResultadoLicenca } from './licenca.js'
import type { EventoLicenca, UsuarioMegan } from './mongo.js'

export interface DepsLicenca {
  agora: () => Date
  contato: string
  buscar: (email: string) => Promise<UsuarioMegan | null>
  /** Grava a máquina só se a chave ainda não tiver uma (atômico); false = outra ativação chegou antes. */
  vincular: (email: string, hashChave: string, maquina: string, agora: Date) => Promise<boolean>
  marcarConsulta: (email: string, agora: Date) => Promise<void>
  evento: (e: Omit<EventoLicenca, 'em'>) => Promise<void>
}

export type RespostaLicenca = ResultadoLicenca & { motivo?: MotivoRecusa }

const REGISTRAR: MotivoRecusa[] = ['chave_invalida', 'outra_maquina']

export async function responderLicenca(
  email: string,
  chave: unknown,
  maquina: string,
  deps: DepsLicenca,
): Promise<RespostaLicenca> {
  const agora = deps.agora()
  let u = await deps.buscar(email)
  if (!u) return avaliarLicenca(null, agora, deps.contato)

  let a = verificarAtivacao(u, chave, maquina)
  if (a.ok && a.vincular) {
    if (await deps.vincular(email, u.licenseKeyHash as string, maquina, agora)) {
      await deps.evento({ email, tipo: 'ativada', maquina })
    } else {
      u = (await deps.buscar(email)) ?? u
      a = verificarAtivacao(u, chave, maquina)
    }
  }
  if (!a.ok) {
    if (REGISTRAR.includes(a.motivo)) await deps.evento({ email, tipo: a.motivo as EventoLicenca['tipo'], maquina })
    return { ...avaliarLicenca(u, agora, deps.contato), ok: false, contratos: 0, mensagem: a.mensagem, motivo: a.motivo }
  }
  await deps.marcarConsulta(email, agora).catch(() => undefined)
  return avaliarLicenca(u, agora, deps.contato)
}
