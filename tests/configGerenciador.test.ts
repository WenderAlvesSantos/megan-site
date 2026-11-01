import { describe, expect, it } from 'vitest'
import { aplicarConfigGerenciador, LOTE_MIGRACAO, type DepsConfigGerenciador } from '../lib/admin.js'

function fila(emails: string[], semConta: string[] = [], falha = false) {
  const pendentes = [...emails]
  const enviados: string[][] = []
  const d: DepsConfigGerenciador = {
    pendentes: async (limite) => pendentes.slice(0, limite),
    contarPendentes: async () => pendentes.length,
    configurar: async (lote) => {
      if (falha) throw new Error('gerenciador fora')
      enviados.push(lote)
      return {
        aplicados: lote.filter((e) => !semConta.includes(e) && !e.startsWith('tem')),
        jaTinham: lote.filter((e) => e.startsWith('tem')),
        semConta: lote.filter((e) => semConta.includes(e)),
      }
    },
    marcar: async (lote) => {
      for (const e of lote) pendentes.splice(pendentes.indexOf(e), 1)
    },
  }
  return { d, enviados, pendentes }
}

describe('aplicarConfigGerenciador', () => {
  it('processa em lotes até acabar; quem já tinha e quem não tem conta também saem da fila', async () => {
    const emails = [...Array.from({ length: LOTE_MIGRACAO + 2 }, (_, i) => `c${i}@x.com`), 'tem@x.com', 'fora@x.com']
    const { d, enviados } = fila(emails, ['fora@x.com'])
    const r1 = await aplicarConfigGerenciador(d)
    expect(r1).toMatchObject({ aplicados: LOTE_MIGRACAO, restantes: 4 })
    const r2 = await aplicarConfigGerenciador(d)
    expect(r2).toEqual({ aplicados: 2, jaTinham: 1, semConta: ['fora@x.com'], restantes: 0 })
    expect(enviados.map((l) => l.length)).toEqual([LOTE_MIGRACAO, 4])
    expect(await aplicarConfigGerenciador(d)).toEqual({ aplicados: 0, jaTinham: 0, semConta: [], restantes: 0 })
  })

  it('gerenciador fora do ar: ninguém é marcado e a próxima tentativa refaz o lote', async () => {
    const { d, pendentes } = fila(['a@x.com'], [], true)
    await expect(aplicarConfigGerenciador(d)).rejects.toThrow('gerenciador fora')
    expect(pendentes).toEqual(['a@x.com'])
  })
})
