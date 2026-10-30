import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { avaliarLicenca } from '../lib/licenca.js'
import { assinaturaWebhookValida, montarPreferencia } from '../lib/mercadopago.js'

describe('montarPreferencia', () => {
  it('cobra R$ 1.599 em até 12x, só Pix e cartão de crédito, e volta para /comprar', () => {
    const p = montarPreferencia({ compraId: 'abc', nome: 'Maria da Silva', email: 'm@x.com', siteUrl: 'https://megan.com' })
    expect(p.items[0]).toMatchObject({ unit_price: 1599, currency_id: 'BRL', quantity: 1 })
    expect(p.payment_methods.installments).toBe(12)
    const excluidos = p.payment_methods.excluded_payment_types.map((t) => t.id)
    expect(excluidos).toEqual(expect.arrayContaining(['ticket', 'debit_card']))
    expect(excluidos).not.toContain('credit_card')
    expect(excluidos).not.toContain('bank_transfer')
    expect(p.external_reference).toBe('abc')
    expect(p.back_urls.success).toBe('https://megan.com/comprar?compra=abc')
    expect(p.notification_url).toBe('https://megan.com/api/mercadopago')
    expect(p.payer).toMatchObject({ name: 'Maria', surname: 'da Silva' })
  })
})

describe('assinaturaWebhookValida', () => {
  const segredo = 'segredo-teste'
  const assinar = (id: string, req: string, ts: string, s = segredo) =>
    createHmac('sha256', s).update(`id:${id};request-id:${req};ts:${ts};`).digest('hex')

  it('aceita a assinatura do Mercado Pago e recusa alterada ou de outro segredo', () => {
    const v1 = assinar('123456', 'req-1', '1704908010')
    expect(assinaturaWebhookValida(`ts=1704908010,v1=${v1}`, 'req-1', '123456', segredo)).toBe(true)
    expect(assinaturaWebhookValida(`ts=1704908010,v1=${v1}`, 'req-1', '999999', segredo)).toBe(false)
    expect(assinaturaWebhookValida(`ts=1704908011,v1=${v1}`, 'req-1', '123456', segredo)).toBe(false)
    const outro = assinar('123456', 'req-1', '1704908010', 'outro')
    expect(assinaturaWebhookValida(`ts=1704908010,v1=${outro}`, 'req-1', '123456', segredo)).toBe(false)
    expect(assinaturaWebhookValida('lixo', 'req-1', '123456', segredo)).toBe(false)
  })
})

describe('avaliarLicenca — plano anual', () => {
  const base = { name: 'Ana', email: 'a@x.com', active: true, contract: 0, createdAt: new Date('2026-10-29'), plan: 'anual' }
  it('vigente libera sem limite de contratos e informa o vencimento', () => {
    const r = avaliarLicenca({ ...base, licenseEndsAt: new Date('2027-10-29T15:00:00Z') }, new Date('2027-01-10'))
    expect(r).toMatchObject({ ok: true, plano: 'anual', contratos: 0, venceEm: '2027-10-29T15:00:00.000Z' })
  })

  it('vencido bloqueia pedindo renovação', () => {
    const r = avaliarLicenca({ ...base, licenseEndsAt: new Date('2027-10-29T15:00:00Z') }, new Date('2027-10-30'), 'wa.me/55')
    expect(r.ok).toBe(false)
    expect(r.mensagem).toContain('licença anual')
    expect(r.mensagem).toContain('29/10/2027')
  })
})
