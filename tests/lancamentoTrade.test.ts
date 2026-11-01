import { describe, expect, it } from 'vitest'
import { gerarChave } from '../lib/chave.js'
import type { TradeGerenciador } from '../lib/gerenciador.js'
import { lancarTrade, validarTrade, type DepsLancamento } from '../lib/lancamentoTrade.js'
import type { UsuarioMegan } from '../lib/mongo.js'

const PC1 = 'a'.repeat(64)
const PC2 = 'b'.repeat(64)
const TRADE = { externalId: 'ab12'.repeat(8), date: '2026-10-30', accountType: 'REAL', asset: 'WIN', contracts: 2, points: 130 }
const { chave, hash } = gerarChave()

function cliente(extra: Partial<UsuarioMegan> = {}): UsuarioMegan {
  return {
    name: 'Ana', email: 'ana@x.com', active: true, contract: 1, createdAt: new Date('2026-10-01'),
    plan: 'trial', licenseKeyHash: hash, machineId: PC1, ...extra,
  }
}

function deps(u: UsuarioMegan | null) {
  const enviados: TradeGerenciador[] = []
  const d: DepsLancamento = {
    buscar: async () => u,
    enviar: async (_email, t) => {
      enviados.push(t)
      return 'criado'
    },
  }
  return { d, enviados }
}

describe('validarTrade', () => {
  it('aceita o trade da Megan e recusa campos fora do padrão', () => {
    expect(validarTrade(TRADE)).toEqual(TRADE)
    expect(validarTrade({ ...TRADE, accountType: 'DEMO' })).toBeNull()
    expect(validarTrade({ ...TRADE, asset: 'WDO' })).toBeNull()
    expect(validarTrade({ ...TRADE, contracts: 1.5 })).toBeNull()
    expect(validarTrade({ ...TRADE, externalId: 'x' })).toBeNull()
    expect(validarTrade({ ...TRADE, date: '30/10/2026' })).toBeNull()
  })
})

describe('lancarTrade', () => {
  it('repassa ao gerenciador quando e-mail, chave e computador conferem', async () => {
    const { d, enviados } = deps(cliente())
    expect(await lancarTrade('ana@x.com', chave, PC1, TRADE, d)).toEqual({ ok: true, status: 'criado' })
    expect(enviados).toHaveLength(1)
  })

  it('recusa chave errada, outro computador, chave ainda não ativada e e-mail desconhecido', async () => {
    for (const [u, c, m] of [
      [cliente(), gerarChave().chave, PC1],
      [cliente(), chave, PC2],
      [cliente({ machineId: undefined }), chave, PC1],
      [null, chave, PC1],
    ] as const) {
      const { d, enviados } = deps(u)
      expect(await lancarTrade('ana@x.com', c, m, TRADE, d)).toMatchObject({ ok: false, status: 'recusado' })
      expect(enviados).toHaveLength(0)
    }
  })

  it('trade inválido nem consulta o banco', async () => {
    const { d } = deps(cliente())
    expect(await lancarTrade('ana@x.com', chave, PC1, { ...TRADE, points: 'x' }, d)).toMatchObject({ status: 'invalido' })
  })
})
