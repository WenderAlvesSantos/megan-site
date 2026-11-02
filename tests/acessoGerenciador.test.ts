import { describe, expect, it } from 'vitest'
import { acessoGerenciador } from '../lib/acessoGerenciador.js'
import type { UsuarioMegan } from '../lib/mongo.js'

const agora = new Date('2026-11-10T13:00:00Z')
const base: UsuarioMegan = { name: 'Ana Lima', email: 'ana@x.com', active: true, contract: 1, createdAt: new Date('2026-10-29') }

describe('acessoGerenciador', () => {
  it('teste vigente libera e informa o vencimento, sem dados de contrato nem nome', () => {
    const r = acessoGerenciador({ ...base, plan: 'trial', trialEndsAt: new Date('2026-11-19T21:30:00Z') }, agora)
    expect(r).toEqual({ ok: true, plano: 'trial', venceEm: '2026-11-19T21:30:00.000Z', mensagem: 'OK' })
  })

  it('assinatura vencida bloqueia com a mesma mensagem do bot', () => {
    const r = acessoGerenciador({ ...base, plan: 'anual', licenseEndsAt: new Date('2026-11-01T00:00:00Z') }, agora, 't.me/megan')
    expect(r.ok).toBe(false)
    expect(r.plano).toBe('anual')
    expect(r.mensagem).toContain('Renove para continuar')
    expect(r.mensagem).toContain('t.me/megan')
  })

  it('desativado ou sem cadastro na Megan bloqueia', () => {
    expect(acessoGerenciador({ ...base, active: false }, agora).ok).toBe(false)
    expect(acessoGerenciador(null, agora)).toMatchObject({ ok: false, plano: '' })
  })
})
