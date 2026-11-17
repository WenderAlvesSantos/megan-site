import { camposNovaChave } from './ativacao.js'
import { gerarChave, type NovaChave } from './chave.js'
import { novaValidadeTeste } from './diasUteis.js'
import type { EmailTesteRenovado } from './emailRenovacaoTeste.js'
import { CONTRATOS_TESTE } from './licenca.js'
import type { EventoLicenca, UsuarioMegan } from './mongo.js'
import { PLANO_VITALICIO } from './plano.js'

export interface DepsRenovarTeste {
  agora: () => Date
  diasTeste: number
  buscarUsuario: (email: string) => Promise<UsuarioMegan | null>
  renovar: (email: string, venceEm: Date, chave: NovaChave | null, agora: Date) => Promise<void>
  enviarEmail: (d: EmailTesteRenovado) => Promise<void>
  evento: (e: Omit<EventoLicenca, 'em'>) => Promise<void>
}

export type ResultadoRenovarTeste =
  | { ok: true; venceEm: string; chave: string | null; emailEnviado: boolean }
  | { ok: false; mensagem: string }

function recusar(u: UsuarioMegan, agora: Date): string | null {
  if (u.plan === PLANO_VITALICIO) return 'Este cliente tem acesso vitalício. Não dá para voltar ao teste gratuito.'
  if (u.plan === 'anual') {
    const vigente = u.licenseEndsAt && new Date(u.licenseEndsAt).getTime() > agora.getTime()
    return vigente
      ? 'Este cliente tem licença anual vigente. Não dá para voltar ao teste gratuito.'
      : 'Este cliente tem licença anual. Não use o teste para quem já pagou.'
  }
  return null
}

/** Suporte devolve N pregões de teste. Chave e computador permanecem. */
export async function renovarTeste(email: string, deps: DepsRenovarTeste): Promise<ResultadoRenovarTeste> {
  const u = await deps.buscarUsuario(email)
  if (!u) return { ok: false, mensagem: 'Cliente não encontrado.' }
  const agora = deps.agora()
  const motivo = recusar(u, agora)
  if (motivo) return { ok: false, mensagem: motivo }
  const venceEm = novaValidadeTeste(u.plan === 'trial' ? u.trialEndsAt : undefined, agora, deps.diasTeste)
  const chave = u.licenseKeyHash ? null : gerarChave()
  await deps.renovar(u.email, venceEm, chave, agora)
  await deps.evento({
    email: u.email,
    tipo: 'teste_renovado',
    detalhe: `suporte até ${venceEm.toISOString()}`,
  })
  if (chave) await deps.evento({ email: u.email, tipo: 'chave_gerada', detalhe: 'teste_renovado' })

  let emailEnviado = true
  await deps.enviarEmail({ para: u.email, nome: u.name, venceEm, chave: chave?.chave ?? null }).catch((e) => {
    emailEnviado = false
    console.error('[admin] e-mail renovação teste', u.email, e)
  })
  return { ok: true, venceEm: venceEm.toISOString(), chave: chave?.chave ?? null, emailEnviado }
}

export function camposRenovacaoTeste(venceEm: Date, chave: NovaChave | null, agora: Date) {
  return {
    plan: 'trial' as const,
    active: true,
    contract: CONTRATOS_TESTE,
    trialEndsAt: venceEm,
    updatedAt: agora,
    ...(chave ? camposNovaChave(chave, agora) : {}),
  }
}
