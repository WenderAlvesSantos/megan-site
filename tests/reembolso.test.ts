import { describe, expect, it } from 'vitest'
import { resumoCompra } from '../lib/admin.js'
import { montarEmailCompra } from '../lib/emailCompra.js'
import { montarEmailReembolso } from '../lib/emailReembolso.js'
import type { PagamentoMP } from '../lib/mercadopago.js'
import type { CompraMegan, EventoLicenca, UsuarioMegan } from '../lib/mongo.js'
import {
  podeReembolsar,
  reembolsarCompra,
  revogarPorEstorno,
  validadeAposReembolso,
  type DepsReembolso,
} from '../lib/reembolso.js'

const PAGA = new Date('2026-11-01T15:00:00Z')
const dias = (n: number) => new Date(PAGA.getTime() + n * 86_400_000)

function compra(extra: Partial<CompraMegan> = {}): CompraMegan {
  return {
    _id: 'c1', email: 'ana@x.com', name: 'Ana Lima', phone: '', plano: 'anual', valor: 1599,
    status: 'aprovada', criadaEm: PAGA, aplicadaEm: PAGA, pagamentoId: '123', ...extra,
  }
}

function banco(c: CompraMegan | null, agora: Date, licenseEndsAt = new Date('2027-11-01T15:00:00Z')) {
  const doc = c ? { ...c } : null
  const u: UsuarioMegan = { name: 'Ana', email: 'ana@x.com', active: true, contract: 0, createdAt: PAGA, plan: 'anual', licenseEndsAt }
  const estornos: string[] = []
  const eventos: Omit<EventoLicenca, 'em'>[] = []
  const emails: Date[] = []
  const d: DepsReembolso = {
    agora: () => agora,
    ultimaCompraPaga: async () => doc,
    buscarCompra: async (id) => (doc && doc._id === id ? doc : null),
    estornar: async (pag) => {
      estornos.push(pag)
    },
    marcarReembolsada: async (_id, quando, origem) => {
      if (!doc || doc.reembolsadaEm) return false
      Object.assign(doc, { reembolsadaEm: quando, reembolsoOrigem: origem, status: 'reembolsada' })
      return true
    },
    buscarUsuario: async () => u,
    encurtarLicenca: async (_e, ate) => {
      u.licenseEndsAt = ate
    },
    evento: async (e) => {
      eventos.push(e)
    },
    avisarCliente: async (_e, _n, ate) => {
      emails.push(ate)
    },
  }
  return { d, doc, u, estornos, eventos, emails }
}

describe('prazo de arrependimento', () => {
  it('7 dias corridos a partir da compra aprovada; depois, sem reembolso', () => {
    expect(podeReembolsar(compra(), dias(6.9))).toBe(true)
    expect(podeReembolsar(compra(), dias(7))).toBe(true)
    expect(podeReembolsar(compra(), dias(7.01))).toBe(false)
    expect(podeReembolsar(compra({ reembolsadaEm: dias(1) }), dias(2))).toBe(false)
    expect(resumoCompra(compra(), dias(2))).toMatchObject({ valor: 1599, podeReembolsar: true, arrependimentoAte: dias(7).toISOString() })
  })

  it('devolver o ano: sem ano anterior a licença termina agora; renovação mantém o ano que já existia', () => {
    const agora = dias(2)
    expect(validadeAposReembolso(new Date('2027-11-01T15:00:00Z'), agora)).toEqual(agora)
    expect(validadeAposReembolso(new Date('2028-03-10T15:00:00Z'), agora)).toEqual(new Date('2027-03-10T15:00:00Z'))
  })
})

describe('reembolsarCompra (suporte)', () => {
  it('dentro dos 7 dias: estorna no Mercado Pago, encerra a licença, registra e avisa o cliente', async () => {
    const b = banco(compra(), dias(3))
    const r = await reembolsarCompra('ana@x.com', b.d)
    expect(r).toEqual({ ok: true, licencaAte: dias(3).toISOString(), emailEnviado: true })
    expect(b.estornos).toEqual(['123'])
    expect(b.doc).toMatchObject({ status: 'reembolsada', reembolsoOrigem: 'suporte' })
    expect(b.u.licenseEndsAt).toEqual(dias(3))
    expect(b.eventos).toEqual([{ email: 'ana@x.com', tipo: 'reembolso', detalhe: 'suporte' }])
  })

  it('depois dos 7 dias não reembolsa e não toca em nada', async () => {
    const b = banco(compra(), dias(8))
    expect(await reembolsarCompra('ana@x.com', b.d)).toMatchObject({ ok: false, motivo: 'fora_do_prazo' })
    expect(b.estornos).toEqual([])
    expect(b.u.licenseEndsAt).toEqual(new Date('2027-11-01T15:00:00Z'))
  })

  it('sem compra paga ou já reembolsada', async () => {
    expect(await reembolsarCompra('ana@x.com', banco(null, dias(1)).d)).toMatchObject({ ok: false, motivo: 'sem_compra' })
    expect(await reembolsarCompra('ana@x.com', banco(compra({ reembolsadaEm: dias(1) }), dias(2)).d)).toMatchObject({
      ok: false,
      motivo: 'ja_reembolsada',
    })
  })

  it('falha no Mercado Pago: nada é alterado (o suporte tenta de novo)', async () => {
    const b = banco(compra(), dias(1))
    b.d.estornar = async () => {
      throw new Error('MP fora')
    }
    await expect(reembolsarCompra('ana@x.com', b.d)).rejects.toThrow('MP fora')
    expect(b.doc?.reembolsadaEm).toBeUndefined()
  })
})

describe('revogarPorEstorno (webhook)', () => {
  const pag = (status: string): PagamentoMP => ({ id: '123', status, currency_id: 'BRL', transaction_amount: 1599, external_reference: 'c1' })

  it('estorno/contestação no Mercado Pago encerram a licença uma única vez', async () => {
    const b = banco(compra(), dias(20))
    expect(await revogarPorEstorno(pag('charged_back'), b.d)).toBe('revogada')
    expect(b.doc).toMatchObject({ reembolsoOrigem: 'mercadopago' })
    expect(await revogarPorEstorno(pag('refunded'), b.d)).toBe('ignorado')
    expect(b.eventos).toHaveLength(1)
  })

  it('compra ainda não liberada é ignorada', async () => {
    expect(await revogarPorEstorno(pag('refunded'), banco(compra({ aplicadaEm: undefined }), dias(1)).d)).toBe('ignorado')
  })
})

describe('e-mail da compra', () => {
  it('informa os 7 dias para desistir e que depois não há reembolso', () => {
    const m = montarEmailCompra({ para: 'ana@x.com', nome: 'Ana', licencaAte: dias(365), chave: null }, 'https://x/zip')
    expect(m.texto).toContain('desistir em até 7 dias')
    expect(m.texto).toContain('não tem reembolso')
    expect(m.html).toContain('Cancelamento:')
  })
})

describe('e-mail do reembolso', () => {
  it('confirma o estorno e diz se ainda sobra licença do ano anterior', () => {
    expect(montarEmailReembolso('Ana Lima', PAGA, PAGA).texto).toContain('foi encerrada')
    expect(montarEmailReembolso('Ana Lima', dias(100), PAGA).texto).toContain('continua valendo')
  })
})
