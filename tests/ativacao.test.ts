import { describe, expect, it } from 'vitest'
import { adminAutorizado, emitirNovaChave, gerarChavesFaltantes, LOTE_MIGRACAO, type DepsAdmin } from '../lib/admin.js'
import { verificarAtivacao } from '../lib/ativacao.js'
import { gerarChave, hashChave, normalizarChave } from '../lib/chave.js'
import { montarEmailChave, type EmailChave } from '../lib/emailChave.js'
import type { EventoLicenca, UsuarioMegan } from '../lib/mongo.js'
import { responderLicenca, type DepsLicenca } from '../lib/pedidoLicenca.js'

const AGORA = new Date('2026-10-30T15:00:00Z')
const PC1 = 'a'.repeat(64)
const PC2 = 'b'.repeat(64)

function cliente(extra: Partial<UsuarioMegan> = {}): UsuarioMegan {
  return {
    name: 'Ana Lima', email: 'ana@x.com', active: true, contract: 1, createdAt: AGORA,
    plan: 'trial', trialEndsAt: new Date('2026-11-12T21:30:00Z'), ...extra,
  }
}

describe('chave', () => {
  it('formato MEGN-XXXX-XXXX-XXXX-XXXX sem I/L/O/U e chaves diferentes a cada geração', () => {
    const a = gerarChave()
    expect(a.chave).toMatch(/^MEGN-[0-9A-HJKMNP-TV-Z]{4}(-[0-9A-HJKMNP-TV-Z]{4}){3}$/)
    expect(gerarChave().chave).not.toBe(a.chave)
    expect(a.final).toBe(a.chave.slice(-4))
  })

  it('aceita a chave com ou sem prefixo, traços, espaços e minúsculas', () => {
    const { chave, hash } = gerarChave()
    const corpo = chave.slice(5)
    for (const variante of [chave, corpo, corpo.replace(/-/g, ''), ` ${chave.toLowerCase()} `, corpo.replace(/-/g, ' ')]) {
      expect(hashChave(variante)).toBe(hash)
    }
    expect(normalizarChave('')).toBe('')
  })
})

describe('verificarAtivacao', () => {
  const { chave, hash } = gerarChave()
  const u = cliente({ licenseKeyHash: hash })
  it('primeira ativação vincula; mesma máquina segue; outra máquina é recusada', () => {
    expect(verificarAtivacao(u, chave, PC1)).toEqual({ ok: true, vincular: true })
    expect(verificarAtivacao({ ...u, machineId: PC1 }, chave, PC1)).toEqual({ ok: true, vincular: false })
    const r = verificarAtivacao({ ...u, machineId: PC1 }, chave, PC2)
    expect(r.ok === false && r.motivo).toBe('outra_maquina')
  })

  it('sem chave, chave errada e cliente sem chave gerada', () => {
    expect(verificarAtivacao(u, '', PC1)).toMatchObject({ ok: false, motivo: 'sem_chave' })
    expect(verificarAtivacao(u, gerarChave().chave, PC1)).toMatchObject({ ok: false, motivo: 'chave_invalida' })
    expect(verificarAtivacao(cliente(), chave, PC1)).toMatchObject({ ok: false, motivo: 'chave_nao_gerada' })
  })
})

function servidor(u: UsuarioMegan | null, opts: { corrida?: string } = {}) {
  const eventos: Omit<EventoLicenca, 'em'>[] = []
  let doc = u ? { ...u } : null
  const d: DepsLicenca = {
    agora: () => AGORA,
    contato: '',
    buscar: async () => (doc ? { ...doc } : null),
    vincular: async (_e, h, m, agora) => {
      if (opts.corrida && doc) Object.assign(doc, { machineId: opts.corrida })
      if (!doc || doc.licenseKeyHash !== h || doc.machineId) return false
      Object.assign(doc, { machineId: m, machineBoundAt: agora })
      return true
    },
    marcarConsulta: async () => undefined,
    evento: async (e) => { eventos.push(e) },
  }
  return { d, eventos, doc: () => doc }
}

describe('responderLicenca', () => {
  const { chave, hash } = gerarChave()

  it('ativa no 1º computador, libera de novo nele e recusa num 2º', async () => {
    const s = servidor(cliente({ licenseKeyHash: hash }))
    expect((await responderLicenca('ana@x.com', chave, PC1, s.d)).ok).toBe(true)
    expect(s.doc()?.machineId).toBe(PC1)
    expect((await responderLicenca('ana@x.com', chave, PC1, s.d)).ok).toBe(true)
    const outro = await responderLicenca('ana@x.com', chave, PC2, s.d)
    expect(outro).toMatchObject({ ok: false, motivo: 'outra_maquina', contratos: 0 })
    expect(s.eventos.map((e) => e.tipo)).toEqual(['ativada', 'outra_maquina'])
  })

  it('duas máquinas ativando ao mesmo tempo: só a primeira fica', async () => {
    const s = servidor(cliente({ licenseKeyHash: hash }), { corrida: PC2 })
    expect(await responderLicenca('ana@x.com', chave, PC1, s.d)).toMatchObject({ ok: false, motivo: 'outra_maquina' })
  })

  it('chave certa não salva teste vencido; chave errada é registrada', async () => {
    const vencido = servidor(cliente({ licenseKeyHash: hash, trialEndsAt: new Date('2026-10-01') }))
    expect((await responderLicenca('ana@x.com', chave, PC1, vencido.d)).mensagem).toContain('terminou')
    const errada = servidor(cliente({ licenseKeyHash: hash }))
    expect(await responderLicenca('ana@x.com', 'MEGN-0000-0000-0000-0000', PC1, errada.d)).toMatchObject({ ok: false, motivo: 'chave_invalida' })
    expect(errada.eventos[0].tipo).toBe('chave_invalida')
    expect(errada.doc()?.machineId).toBeUndefined()
  })
})

function admin(usuarios: UsuarioMegan[], falhaEmail = false) {
  const emails: EmailChave[] = []
  const d: DepsAdmin = {
    agora: () => AGORA,
    buscarUsuario: async (email) => usuarios.find((u) => u.email === email) ?? null,
    trocarChave: async (email, campos) => {
      const u = usuarios.find((x) => x.email === email)!
      Object.assign(u, campos)
      delete u.machineId
      delete u.machineBoundAt
    },
    semChave: async () => usuarios.filter((u) => !u.licenseKeyHash && u.active),
    enviarEmailChave: async (e) => {
      if (falhaEmail) throw new Error('resend fora')
      emails.push(e)
    },
    evento: async () => undefined,
  }
  return { d, emails }
}

describe('suporte', () => {
  it('senha do admin', () => {
    expect(adminAutorizado('Bearer senha-forte-123', 'senha-forte-123')).toBe(true)
    expect(adminAutorizado('Bearer outra', 'senha-forte-123')).toBe(false)
  })

  it('nova chave: a antiga deixa de valer, o computador é liberado e o cliente recebe por e-mail', async () => {
    const antiga = gerarChave()
    const u = cliente({ licenseKeyHash: antiga.hash, machineId: PC1 })
    const { d, emails } = admin([u])
    const r = await emitirNovaChave('ana@x.com', 'troca', d)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(u.licenseKeyHash).toBe(hashChave(r.chave))
    expect(u.machineId).toBeUndefined()
    expect(verificarAtivacao(u, antiga.chave, PC1)).toMatchObject({ ok: false, motivo: 'chave_invalida' })
    expect(verificarAtivacao(u, r.chave, PC2)).toEqual({ ok: true, vincular: true })
    expect(emails[0]).toMatchObject({ para: 'ana@x.com', chave: r.chave, motivo: 'troca' })
  })

  it('cliente inexistente e falha no e-mail', async () => {
    expect((await emitirNovaChave('zz@x.com', 'troca', admin([]).d)).ok).toBe(false)
    const r = await emitirNovaChave('ana@x.com', 'troca', admin([cliente()], true).d)
    expect(r).toMatchObject({ ok: true, emailEnviado: false })
  })

  it('gera chave só para quem tem acesso válido, em lotes', async () => {
    const lista = [
      cliente({ email: 'vale@x.com' }),
      cliente({ email: 'vencido@x.com', trialEndsAt: new Date('2026-10-01') }),
      cliente({ email: 'tem@x.com', licenseKeyHash: 'x' }),
      cliente({ email: 'vitalicio@x.com', plan: undefined, contract: 200 }),
      ...Array.from({ length: LOTE_MIGRACAO }, (_, i) => cliente({ email: `c${i}@x.com` })),
    ]
    const { d, emails } = admin(lista)
    const r1 = await gerarChavesFaltantes(d)
    expect(r1).toMatchObject({ geradas: LOTE_MIGRACAO, restantes: 2 })
    const r2 = await gerarChavesFaltantes(d)
    expect(r2).toMatchObject({ geradas: 2, restantes: 0 })
    expect(emails.map((e) => e.para)).not.toContain('vencido@x.com')
    expect(emails.map((e) => e.para)).not.toContain('tem@x.com')
    expect(emails.every((e) => e.motivo === 'migracao')).toBe(true)
  })

  it('e-mail da chave', () => {
    const m = montarEmailChave({ para: 'a@b.com', nome: 'Ana', chave: 'MEGN-AAAA-BBBB-CCCC-DDDD', motivo: 'troca' })
    expect(m.texto).toContain('MEGN-AAAA-BBBB-CCCC-DDDD')
    expect(m.texto).toContain('anterior deixou de funcionar')
  })
})
