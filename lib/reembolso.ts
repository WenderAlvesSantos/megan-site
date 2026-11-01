import type { PagamentoMP } from './mercadopago.js'
import type { CompraMegan, EventoLicenca, UsuarioMegan } from './mongo.js'

/** Direito de arrependimento (CDC, art. 49): 7 dias corridos a partir da compra aprovada. Depois, sem reembolso. */
export const PRAZO_ARREPENDIMENTO_DIAS = 7
const DIA_MS = 86_400_000

export function fimDoArrependimento(compra: Pick<CompraMegan, 'aplicadaEm'>): Date | null {
  return compra.aplicadaEm ? new Date(new Date(compra.aplicadaEm).getTime() + PRAZO_ARREPENDIMENTO_DIAS * DIA_MS) : null
}

export function podeReembolsar(compra: Pick<CompraMegan, 'aplicadaEm' | 'reembolsadaEm'>, agora: Date): boolean {
  const fim = fimDoArrependimento(compra)
  return !!fim && !compra.reembolsadaEm && agora.getTime() <= fim.getTime()
}

/**
 * Validade depois de devolver um ano pago: tira o ano desta compra. Se era renovação e ainda sobra
 * validade do ano anterior, ela continua; senão a licença termina agora.
 */
export function validadeAposReembolso(licenseEndsAt: Date | undefined, agora: Date): Date {
  if (!licenseEndsAt) return agora
  const sem = new Date(licenseEndsAt)
  sem.setUTCFullYear(sem.getUTCFullYear() - 1)
  return sem.getTime() > agora.getTime() ? sem : agora
}

export interface DepsReembolso {
  agora: () => Date
  /** Compra paga mais recente do e-mail (inclusive já reembolsada). */
  ultimaCompraPaga: (email: string) => Promise<CompraMegan | null>
  buscarCompra: (id: string) => Promise<CompraMegan | null>
  estornar: (pagamentoId: string, compraId: string) => Promise<void>
  /** Marca a compra como reembolsada só se ainda não estiver; false = já tinha sido reembolsada. */
  marcarReembolsada: (compraId: string, agora: Date, origem: 'suporte' | 'mercadopago') => Promise<boolean>
  buscarUsuario: (email: string) => Promise<UsuarioMegan | null>
  /** Grava a nova validade da licença anual. */
  encurtarLicenca: (email: string, licencaAte: Date) => Promise<void>
  evento: (e: Omit<EventoLicenca, 'em'>) => Promise<void>
  avisarCliente: (email: string, nome: string, licencaAte: Date) => Promise<void>
}

export type ResultadoReembolso =
  | { ok: true; licencaAte: string; emailEnviado: boolean }
  | { ok: false; motivo: 'sem_compra' | 'fora_do_prazo' | 'ja_reembolsada' | 'sem_pagamento'; mensagem: string }

async function revogar(compra: CompraMegan, origem: 'suporte' | 'mercadopago', deps: DepsReembolso) {
  const agora = deps.agora()
  if (!(await deps.marcarReembolsada(compra._id, agora, origem))) return null
  const u = await deps.buscarUsuario(compra.email)
  const licencaAte = validadeAposReembolso(u?.licenseEndsAt, agora)
  await deps.encurtarLicenca(compra.email, licencaAte)
  await deps.evento({ email: compra.email, tipo: 'reembolso', detalhe: origem })
  return licencaAte
}

/** Suporte (/admin): estorna no Mercado Pago e encerra a licença deste ano, só dentro dos 7 dias. */
export async function reembolsarCompra(email: string, deps: DepsReembolso): Promise<ResultadoReembolso> {
  const compra = await deps.ultimaCompraPaga(email)
  if (!compra) return { ok: false, motivo: 'sem_compra', mensagem: 'Este cliente não tem compra paga.' }
  if (compra.reembolsadaEm) return { ok: false, motivo: 'ja_reembolsada', mensagem: 'A última compra já foi reembolsada.' }
  if (!podeReembolsar(compra, deps.agora())) {
    return { ok: false, motivo: 'fora_do_prazo', mensagem: 'O prazo de 7 dias para arrependimento terminou — sem reembolso.' }
  }
  if (!compra.pagamentoId) return { ok: false, motivo: 'sem_pagamento', mensagem: 'Compra sem o id do pagamento no Mercado Pago.' }

  await deps.estornar(compra.pagamentoId, compra._id)
  const licencaAte = (await revogar(compra, 'suporte', deps)) ?? deps.agora()
  let emailEnviado = true
  try {
    await deps.avisarCliente(compra.email, compra.name, licencaAte)
  } catch (e) {
    emailEnviado = false
    console.error('[reembolso] e-mail', compra.email, e)
  }
  return { ok: true, licencaAte: licencaAte.toISOString(), emailEnviado }
}

/** Webhook: estorno ou contestação feitos direto no Mercado Pago também encerram a licença deste ano. */
export async function revogarPorEstorno(p: PagamentoMP, deps: DepsReembolso): Promise<'revogada' | 'ignorado'> {
  const compra = await deps.buscarCompra(String(p.external_reference ?? ''))
  if (!compra?.aplicadaEm || compra.reembolsadaEm) return 'ignorado'
  return (await revogar(compra, 'mercadopago', deps)) ? 'revogada' : 'ignorado'
}
