import { describe, expect, it } from 'vitest'
import { iniciarCompra, pagamentoConfirma, type DepsCheckout } from '../lib/compra.js'
import { montarEmailCompra } from '../lib/emailCompra.js'
import { liberarCompra, situacaoCompra } from '../lib/liberacao.js'
import type { CompraMegan } from '../lib/mongo.js'
import { novaValidadeAnual } from '../lib/plano.js'
import { AGORA, banco, ID, pagamento, usuario } from './fakes.js'

const contato = { nome: 'Maria da Silva', email: 'Maria@Exemplo.com', telefone: '(11) 91234-5678', aceite: true, website: '' }

describe('novaValidadeAnual', () => {
  it('cliente novo, teste ou anual vencido: 1 ano a partir de agora', () => {
    for (const u of [null, usuario({ plan: 'trial', trialEndsAt: new Date('2026-11-12') }),
      usuario({ plan: 'anual', licenseEndsAt: new Date('2026-10-01') })]) {
      expect(novaValidadeAnual(u, AGORA).toISOString()).toBe('2027-10-29T15:00:00.000Z')
    }
  })

  it('renovação com anual vigente soma 1 ano ao vencimento', () => {
    const u = usuario({ plan: 'anual', licenseEndsAt: new Date('2027-02-10T12:00:00Z') })
    expect(novaValidadeAnual(u, AGORA).toISOString()).toBe('2028-02-10T12:00:00.000Z')
  })
})

describe('iniciarCompra', () => {
  function deps() {
    const salvas: CompraMegan[] = []
    const d: DepsCheckout = {
      gerarId: () => ID,
      agora: () => AGORA,
      salvarCompra: async (c) => { salvas.push(c) },
      criarPreferencia: async () => ({ id: 'pref-1', url: 'https://mp/checkout' }),
      registrarPreferencia: async (id, pref) => { salvas.find((c) => c._id === id)!.preferenciaId = pref },
    }
    return { d, salvas }
  }

  it('grava a compra pendente com o preço do servidor e devolve o link do Mercado Pago', async () => {
    const { d, salvas } = deps()
    const r = await iniciarCompra({ ...contato, valor: 1 }, d)
    expect(r).toEqual({ status: 'ok', url: 'https://mp/checkout' })
    expect(salvas[0]).toMatchObject({ _id: ID, email: 'maria@exemplo.com', valor: 1599, status: 'pendente', preferenciaId: 'pref-1' })
  })

  it('dados inválidos não abrem pagamento', async () => {
    const { d, salvas } = deps()
    expect((await iniciarCompra({ ...contato, aceite: false }, d)).status).toBe('invalido')
    expect(salvas).toHaveLength(0)
  })
})

describe('pagamentoConfirma', () => {
  const compra = { _id: ID, valor: 1599 } as CompraMegan
  it('exige aprovado, BRL, valor cheio e a mesma compra', () => {
    expect(pagamentoConfirma(pagamento(), compra)).toBe(true)
    expect(pagamentoConfirma(pagamento({ status: 'pending' }), compra)).toBe(false)
    expect(pagamentoConfirma(pagamento({ transaction_amount: 15.99 }), compra)).toBe(false)
    expect(pagamentoConfirma(pagamento({ currency_id: 'USD' }), compra)).toBe(false)
    expect(pagamentoConfirma(pagamento({ external_reference: 'outra' }), compra)).toBe(false)
  })
})

describe('liberarCompra', () => {
  it('pagamento aprovado libera 1 ano, cria acesso no gerenciador e envia o e-mail', async () => {
    const { d, compra, ativacoes, emails } = banco()
    const r = await liberarCompra(pagamento(), d)
    expect(r).toEqual({ status: 'liberada', licencaAte: new Date('2027-10-29T15:00:00Z') })
    expect(ativacoes).toHaveLength(1)
    expect(compra).toMatchObject({ status: 'aprovada', pagamentoId: '987' })
    expect(emails[0]).toMatchObject({ para: 'maria@exemplo.com', conta: { senha: 'Ab3dEf7h' } })
  })

  it('webhook repetido não soma outro ano', async () => {
    const { d, ativacoes, emails } = banco()
    await liberarCompra(pagamento(), d)
    expect((await liberarCompra(pagamento(), d)).status).toBe('ja_liberada')
    expect(ativacoes).toHaveLength(1)
    expect(emails).toHaveLength(1)
  })

  it('pagamento pendente ou de outra compra é ignorado', async () => {
    const { d, ativacoes } = banco()
    expect((await liberarCompra(pagamento({ status: 'pending' }), d)).status).toBe('ignorado')
    expect((await liberarCompra(pagamento({ external_reference: 'x' }), d)).status).toBe('ignorado')
    expect(ativacoes).toHaveLength(0)
  })

  it('falha ao gravar a licença desfaz a reserva para o Mercado Pago reenviar', async () => {
    const { d, compra } = banco({ falhaAtivar: true })
    await expect(liberarCompra(pagamento(), d)).rejects.toThrow('mongo fora')
    expect(compra.aplicadaEm).toBeUndefined()
  })

  it('gerenciador fora do ar não impede a liberação nem o e-mail', async () => {
    const { d, emails } = banco({ falhaGerenciador: true })
    expect((await liberarCompra(pagamento(), d)).status).toBe('liberada')
    expect(emails[0].conta).toBeUndefined()
  })

  it('cliente sem chave ganha chave nova no e-mail; quem já tem continua com a mesma', async () => {
    const novo = banco()
    await liberarCompra(pagamento(), novo.d)
    expect(novo.chaves[0]?.chave).toMatch(/^MEGN-/)
    expect(novo.emails[0].chave).toBe(novo.chaves[0]?.chave)
    const antigo = banco({ usuario: usuario({ plan: 'trial', licenseKeyHash: 'abc', machineId: 'm1' }) })
    await liberarCompra(pagamento(), antigo.d)
    expect(antigo.chaves[0]).toBeNull()
    expect(antigo.emails[0].chave).toBeNull()
  })

  it('licença sem vencimento (cliente antigo) não é rebaixada para anual', async () => {
    const { d, ativacoes } = banco({ usuario: usuario({ contract: 200 }) })
    expect((await liberarCompra(pagamento(), d)).status).toBe('sem_vencimento')
    expect(ativacoes).toHaveLength(0)
  })
})

describe('situacaoCompra', () => {
  it('sem webhook ainda: acha o pagamento aprovado no Mercado Pago e libera', async () => {
    const { d, ativacoes } = banco({ pagamentos: [pagamento()] })
    const s = await situacaoCompra(ID, d)
    expect(s).toEqual({ status: 'aprovada', email: 'ma***@exemplo.com', licencaAte: '2027-10-29T15:00:00.000Z' })
    expect(ativacoes).toHaveLength(1)
  })

  it('pendente, recusada e inexistente', async () => {
    expect((await situacaoCompra(ID, banco({ pagamentos: [pagamento({ status: 'pending' })] }).d)).status).toBe('pendente')
    expect((await situacaoCompra(ID, banco().d)).status).toBe('pendente')
    expect((await situacaoCompra(ID, banco({ pagamentos: [pagamento({ status: 'rejected' })] }).d)).status).toBe('recusada')
    expect((await situacaoCompra('outra', banco().d)).status).toBe('nao_encontrada')
  })
})

describe('montarEmailCompra', () => {
  it('leva link, validade e acesso ao gerenciador', () => {
    const m = montarEmailCompra(
      { para: 'a@b.com', nome: 'Ana Lima', licencaAte: new Date('2027-10-29T15:00:00Z'), conta: { url: 'https://g', senha: 'Xy3' }, chave: 'MEGN-1234-5678-9ABC-DEFG' },
      'https://drive/x',
    )
    for (const corpo of [m.texto, m.html]) {
      expect(corpo).toContain('https://drive/x')
      expect(corpo).toContain('29/10/2027')
      expect(corpo).toContain('Xy3')
      expect(corpo).toContain('MEGN-1234-5678-9ABC-DEFG')
    }
  })

  it('cliente que já tem chave: lembra de usar a mesma', () => {
    const m = montarEmailCompra({ para: 'a@b.com', nome: 'Ana', licencaAte: new Date(), chave: null }, 'https://drive/x')
    expect(m.texto).toContain('mesma chave de ativação')
    expect(m.texto).not.toContain('Chave: ')
  })
})
