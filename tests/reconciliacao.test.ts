import { describe, expect, it } from 'vitest'
import { reconciliarPendentes, type DepsReconciliacao } from '../lib/reconciliacao.js'
import { AGORA, banco, ID, pagamento, type OpcoesBanco } from './fakes.js'

function deps(opts: OpcoesBanco = {}, ids: string[] = [ID]) {
  const b = banco(opts)
  const consultas: { desde: Date; limite: number }[] = []
  const d: DepsReconciliacao = {
    ...b.d,
    listarPendentes: async (desde, limite) => {
      consultas.push({ desde, limite })
      return ids
    },
  }
  return { ...b, d, consultas }
}

describe('reconciliarPendentes', () => {
  it('libera compra paga cujo aviso do Mercado Pago se perdeu', async () => {
    const { d, ativacoes, emails, consultas } = deps({ pagamentos: [pagamento()] })
    expect(await reconciliarPendentes(d)).toEqual({ verificadas: 1, liberadas: 1, falhas: 0 })
    expect(ativacoes).toHaveLength(1)
    expect(emails).toHaveLength(1)
    expect(consultas[0].desde.toISOString()).toBe(new Date(AGORA.getTime() - 7 * 86_400_000).toISOString())
  })

  it('rodar de novo não libera outra vez', async () => {
    const { d, ativacoes } = deps({ pagamentos: [pagamento()] })
    await reconciliarPendentes(d)
    await reconciliarPendentes(d)
    expect(ativacoes).toHaveLength(1)
  })

  it('Pix ainda pendente segue aguardando', async () => {
    const { d, ativacoes } = deps({ pagamentos: [pagamento({ status: 'pending' })] })
    expect(await reconciliarPendentes(d)).toEqual({ verificadas: 1, liberadas: 0, falhas: 0 })
    expect(ativacoes).toHaveLength(0)
  })

  it('erro numa compra não impede as outras', async () => {
    const { d } = deps({ pagamentos: [pagamento()], falhaAtivar: true }, [ID, 'inexistente'])
    expect(await reconciliarPendentes(d)).toEqual({ verificadas: 2, liberadas: 0, falhas: 1 })
  })
})
