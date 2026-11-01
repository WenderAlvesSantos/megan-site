import type { Filter } from 'mongodb'
import type { UsuarioMegan } from './mongo.js'

export const STATUS_CLIENTE = ['teste', 'assinante', 'teste_vencido', 'assinatura_vencida', 'licenca', 'desativado'] as const
export type StatusCliente = (typeof STATUS_CLIENTE)[number]

const vigente = (d: Date | undefined, agora: Date) => !!d && new Date(d).getTime() > agora.getTime()

/** Situação atual do cliente (mesma regra da API de licença: plano + vencimento + ativo). */
export function statusCliente(u: UsuarioMegan, agora: Date): StatusCliente {
  if (!u.active) return 'desativado'
  if (u.plan === 'trial') return vigente(u.trialEndsAt, agora) ? 'teste' : 'teste_vencido'
  if (u.plan === 'anual') return vigente(u.licenseEndsAt, agora) ? 'assinante' : 'assinatura_vencida'
  return 'licenca'
}

export function ehStatusCliente(v: unknown): v is StatusCliente {
  return (STATUS_CLIENTE as readonly string[]).includes(String(v))
}

/** Mesmo critério de `statusCliente`, como consulta do Mongo (para filtrar a lista no banco). */
export function filtroStatus(status: StatusCliente, agora: Date): Filter<UsuarioMegan> {
  const ativo = { active: true }
  switch (status) {
    case 'desativado':
      return { active: { $ne: true } }
    case 'teste':
      return { ...ativo, plan: 'trial', trialEndsAt: { $gt: agora } }
    case 'teste_vencido':
      return { ...ativo, plan: 'trial', $or: [{ trialEndsAt: { $lte: agora } }, { trialEndsAt: { $exists: false } }] }
    case 'assinante':
      return { ...ativo, plan: 'anual', licenseEndsAt: { $gt: agora } }
    case 'assinatura_vencida':
      return { ...ativo, plan: 'anual', $or: [{ licenseEndsAt: { $lte: agora } }, { licenseEndsAt: { $exists: false } }] }
    case 'licenca':
      return { ...ativo, plan: { $nin: ['trial', 'anual'] } }
  }
}
