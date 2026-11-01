import { createHmac, timingSafeEqual } from 'node:crypto'
import { obrigatoria } from './config.js'
import { PLANO_ANUAL } from './plano.js'

const API = 'https://api.mercadopago.com'

export interface PagamentoMP {
  id: number | string
  status: string
  currency_id: string
  transaction_amount: number
  external_reference: string | null
}

export interface DadosPreferencia {
  compraId: string
  nome: string
  email: string
  siteUrl: string
}

export function montarPreferencia({ compraId, nome, email, siteUrl }: DadosPreferencia) {
  const [primeiro, ...resto] = nome.split(' ')
  const retorno = `${siteUrl}/comprar?compra=${encodeURIComponent(compraId)}`
  return {
    items: [
      { id: PLANO_ANUAL.id, title: PLANO_ANUAL.titulo, quantity: 1, currency_id: 'BRL', unit_price: PLANO_ANUAL.preco },
    ],
    payer: { name: primeiro, surname: resto.join(' '), email },
    external_reference: compraId,
    // Só Pix (bank_transfer) e cartão de crédito
    payment_methods: {
      excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }, { id: 'debit_card' }, { id: 'prepaid_card' }],
      installments: PLANO_ANUAL.parcelas,
    },
    back_urls: { success: retorno, pending: retorno, failure: retorno },
    auto_return: 'approved',
    notification_url: `${siteUrl}/api/mercadopago`,
    statement_descriptor: 'MEGAN N18',
  }
}

export class ErroMercadoPago extends Error {
  constructor(readonly status: number, detalhe: string) {
    super(`Mercado Pago HTTP ${status}: ${detalhe}`)
  }
}

async function chamar<T>(caminho: string, init: RequestInit = {}): Promise<T> {
  const resp = await fetch(`${API}${caminho}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${obrigatoria('MP_ACCESS_TOKEN')}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(10_000),
  })
  if (!resp.ok) throw new ErroMercadoPago(resp.status, (await resp.text()).slice(0, 300))
  return (await resp.json()) as T
}

export async function criarPreferencia(dados: DadosPreferencia): Promise<{ id: string; url: string }> {
  const r = await chamar<{ id: string; init_point: string }>('/checkout/preferences', {
    method: 'POST',
    headers: { 'X-Idempotency-Key': dados.compraId },
    body: JSON.stringify(montarPreferencia(dados)),
  })
  return { id: r.id, url: r.init_point }
}

export function buscarPagamento(id: string): Promise<PagamentoMP> {
  return chamar<PagamentoMP>(`/v1/payments/${encodeURIComponent(id)}`)
}

/** Estorno total do pagamento (Pix devolvido / cartão: parcelas canceladas pelo Mercado Pago). */
export async function estornarPagamento(pagamentoId: string, compraId: string): Promise<void> {
  await chamar(`/v1/payments/${encodeURIComponent(pagamentoId)}/refunds`, {
    method: 'POST',
    headers: { 'X-Idempotency-Key': `reembolso-${compraId}` },
    body: '{}',
  })
}

/** Status do pagamento no Mercado Pago quando o dinheiro voltou ao cliente. */
export const STATUS_ESTORNADO = ['refunded', 'charged_back']

export async function pagamentosDaCompra(compraId: string): Promise<PagamentoMP[]> {
  const r = await chamar<{ results?: PagamentoMP[] }>(
    `/v1/payments/search?external_reference=${encodeURIComponent(compraId)}&sort=date_created&criteria=desc`,
  )
  return r.results ?? []
}

/** x-signature "ts=...,v1=..." = HMAC-SHA256 de "id:<data.id>;request-id:<x-request-id>;ts:<ts>;" */
export function assinaturaWebhookValida(
  xSignature: string,
  xRequestId: string,
  dataId: string,
  segredo: string,
): boolean {
  const partes = Object.fromEntries(
    xSignature.split(',').map((p) => {
      const [k, ...v] = p.split('=')
      return [k.trim(), v.join('=').trim()]
    }),
  )
  const { ts, v1 } = partes as Record<string, string | undefined>
  if (!ts || !v1 || !dataId) return false
  const id = /^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId
  const manifesto = `id:${id};${xRequestId ? `request-id:${xRequestId};` : ''}ts:${ts};`
  const esperado = Buffer.from(createHmac('sha256', segredo).update(manifesto).digest('hex'))
  const recebido = Buffer.from(v1)
  return esperado.length === recebido.length && timingSafeEqual(esperado, recebido)
}
