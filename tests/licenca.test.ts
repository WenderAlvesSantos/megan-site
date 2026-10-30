import { generateKeyPairSync, verify } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { assinar } from '../lib/assinatura.js'
import { avaliarLicenca } from '../lib/licenca.js'
import type { UsuarioMegan } from '../lib/mongo.js'

const agora = new Date('2026-11-10T13:00:00Z')
const base: UsuarioMegan = { name: 'Ana Lima', email: 'ana@x.com', active: true, contract: 1, createdAt: new Date('2026-10-29') }

describe('avaliarLicenca', () => {
  it('trial vigente libera com vencimento', () => {
    const r = avaliarLicenca({ ...base, plan: 'trial', trialEndsAt: new Date('2026-11-19T21:30:00Z') }, agora)
    expect(r).toMatchObject({ ok: true, plano: 'trial', contratos: 1, venceEm: '2026-11-19T21:30:00.000Z' })
  })

  it('trial vencido bloqueia e cita a data', () => {
    const r = avaliarLicenca({ ...base, plan: 'trial', trialEndsAt: new Date('2026-11-09T21:30:00Z') }, agora, 'wa.me/5511')
    expect(r.ok).toBe(false)
    expect(r.mensagem).toContain('09/11/2026')
    expect(r.mensagem).toContain('wa.me/5511')
  })

  it('usuário antigo sem plano segue liberado sem vencimento', () => {
    const r = avaliarLicenca({ ...base, contract: 200 }, agora)
    expect(r).toMatchObject({ ok: true, plano: 'licenca', contratos: 200, venceEm: null })
  })

  it('inativo e inexistente bloqueiam', () => {
    expect(avaliarLicenca({ ...base, active: false }, agora).ok).toBe(false)
    expect(avaliarLicenca(null, agora).ok).toBe(false)
  })
})

describe('assinar', () => {
  it('assinatura confere com a chave pública e quebra se o payload mudar', () => {
    const { privateKey, publicKey } = generateKeyPairSync('ed25519')
    const r = assinar({ ok: true, nonce: 'abc' }, privateKey)
    const sig = Buffer.from(r.sig, 'base64')
    expect(verify(null, Buffer.from(r.payload), publicKey, sig)).toBe(true)
    expect(verify(null, Buffer.from(r.payload.replace('true', 'false')), publicKey, sig)).toBe(false)
  })
})
