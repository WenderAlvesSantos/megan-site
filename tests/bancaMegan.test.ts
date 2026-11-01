import { describe, expect, it } from 'vitest'
import { bancaMegan, validarPedidoBanca, type DepsBanca } from '../lib/bancaMegan.js'
import { gerarChave } from '../lib/chave.js'
import type { BancaGerenciador, ContaTipo, MudancasBanca } from '../lib/gerenciador.js'
import type { UsuarioMegan } from '../lib/mongo.js'

const PC1 = 'a'.repeat(64)
const { chave, hash } = gerarChave()
const BANCA: BancaGerenciador = {
  configured: true, bankrollConfirmed: true, initialBankroll: 10_000, bankroll: 10_000, contracts: 1, suggestedContracts: 12,
  maxContracts: 150, stopCostPerContract: 62.88, protecting: false,
}

function cliente(): UsuarioMegan {
  return {
    name: 'Ana', email: 'ana@x.com', active: true, contract: 50, createdAt: new Date('2026-10-01'),
    plan: 'anual', licenseKeyHash: hash, machineId: PC1,
  }
}

function deps(u: UsuarioMegan | null, resposta: BancaGerenciador | 'sem_usuario' = BANCA) {
  const pedidos: ({ conta: ContaTipo } & MudancasBanca)[] = []
  const d: DepsBanca = {
    buscar: async () => u,
    consultar: async (_e, conta, mudancas) => {
      pedidos.push({ conta, ...mudancas })
      return resposta
    },
  }
  return { d, pedidos }
}

describe('validarPedidoBanca', () => {
  it('consulta sem banca, sincroniza com banca positiva (centavos) e recusa o resto', () => {
    expect(validarPedidoBanca({ accountType: 'REAL' })).toEqual({ conta: 'REAL' })
    expect(validarPedidoBanca({ accountType: 'SIMULADOR', banca: '5000.555' })).toEqual({ conta: 'SIMULADOR', banca: 5000.56 })
    expect(validarPedidoBanca({ accountType: 'REAL', banca: 0 })).toBeNull()
    expect(validarPedidoBanca({ accountType: 'REAL', banca: 'abc' })).toBeNull()
    expect(validarPedidoBanca({ accountType: 'DEMO' })).toBeNull()
  })

  it('confirmação da banca padrão só com o valor true', () => {
    expect(validarPedidoBanca({ accountType: 'REAL', confirmarBanca: true })).toEqual({ conta: 'REAL', confirmar: true })
    expect(validarPedidoBanca({ accountType: 'REAL', confirmarBanca: 'sim' })).toEqual({ conta: 'REAL' })
  })

  it('contratos com que a Megan iniciou: inteiro de 1 a 10.000', () => {
    expect(validarPedidoBanca({ accountType: 'REAL', contratos: 12 })).toEqual({ conta: 'REAL', contratos: 12 })
    expect(validarPedidoBanca({ accountType: 'REAL', contratos: 0 })).toBeNull()
    expect(validarPedidoBanca({ accountType: 'REAL', contratos: 1.5 })).toBeNull()
  })
})

describe('bancaMegan', () => {
  it('com a licença deste computador, sincroniza a banca e devolve a sugestão', async () => {
    const { d, pedidos } = deps(cliente())
    const r = await bancaMegan('ana@x.com', chave, PC1, { accountType: 'REAL', banca: 10_000 }, d)
    expect(r).toEqual({ ok: true, status: 'ok', banca: BANCA })
    expect(pedidos).toEqual([{ conta: 'REAL', banca: 10_000 }])
  })

  it('informa os contratos com que iniciou no ao vivo', async () => {
    const { d, pedidos } = deps(cliente())
    await bancaMegan('ana@x.com', chave, PC1, { accountType: 'SIMULADOR', contratos: 8 }, d)
    expect(pedidos).toEqual([{ conta: 'SIMULADOR', contratos: 8 }])
  })

  it('outro computador ou chave errada não lê nem altera a banca', async () => {
    for (const [c, m] of [[chave, 'b'.repeat(64)], [gerarChave().chave, PC1]] as const) {
      const { d, pedidos } = deps(cliente())
      expect(await bancaMegan('ana@x.com', c, m, { accountType: 'REAL', banca: 1 }, d)).toMatchObject({ ok: false, status: 'recusado' })
      expect(pedidos).toHaveLength(0)
    }
  })

  it('e-mail sem conta no gerenciador', async () => {
    const { d } = deps(cliente(), 'sem_usuario')
    expect(await bancaMegan('ana@x.com', chave, PC1, { accountType: 'SIMULADOR' }, d)).toEqual({ ok: true, status: 'sem_usuario' })
  })
})
