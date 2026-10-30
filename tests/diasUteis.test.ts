import { describe, expect, it } from 'vitest'
import { ehPregao, fimDoTeste } from '../lib/diasUteis.js'

const brt = (iso: string) => new Date(`${iso}-03:00`)

describe('fimDoTeste', () => {
  it('conta o dia do cadastro quando é pregão antes das 18:30', () => {
    // Qui 29/10/2026 10h: 29,30 / 03..06 (02/11 feriado) / 09..13 / 16..19 → 15º pregão = 19/11
    expect(fimDoTeste(brt('2026-10-29T10:00:00'), 15).toISOString()).toBe('2026-11-19T21:30:00.000Z')
  })

  it('cadastro depois do fechamento começa no próximo pregão', () => {
    expect(fimDoTeste(brt('2026-10-29T19:00:00'), 15).toISOString()).toBe('2026-11-23T21:30:00.000Z')
  })

  it('cadastro no fim de semana começa na segunda', () => {
    // Sáb 31/10 → 03/11 é o 1º (02/11 feriado); 20/11 feriado → 15º = 24/11
    expect(fimDoTeste(brt('2026-10-31T09:00:00'), 15).toISOString()).toBe('2026-11-24T21:30:00.000Z')
  })

  it('pula Natal e Ano Novo', () => {
    // Seg 21/12/2026: 21,22,23 / 28,29,30 / 04..08/01 / 11..14/01 → 15º = 14/01/2027
    expect(fimDoTeste(brt('2026-12-21T09:00:00'), 15).toISOString()).toBe('2027-01-14T21:30:00.000Z')
  })

  it('1 dia útil no próprio pregão vence às 18:30 do mesmo dia', () => {
    expect(fimDoTeste(brt('2026-10-29T09:00:00'), 1).toISOString()).toBe('2026-10-29T21:30:00.000Z')
  })
})

describe('ehPregao', () => {
  it('fim de semana e feriado não são pregão', () => {
    expect(ehPregao(new Date(Date.UTC(2026, 9, 31)))).toBe(false)
    expect(ehPregao(new Date(Date.UTC(2026, 10, 2)))).toBe(false)
    expect(ehPregao(new Date(Date.UTC(2026, 10, 3)))).toBe(true)
  })
})
