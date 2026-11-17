import { describe, expect, it } from 'vitest'
import { novaValidadeTeste } from '../lib/diasUteis.js'
import { montarEmailTesteRenovado } from '../lib/emailRenovacaoTeste.js'
import type { EmailTesteRenovado } from '../lib/emailRenovacaoTeste.js'
import type { EventoLicenca, UsuarioMegan } from '../lib/mongo.js'
import { camposRenovacaoTeste, renovarTeste, type DepsRenovarTeste } from '../lib/renovarTeste.js'
import { AGORA, usuario } from './fakes.js'

function deps(u: UsuarioMegan | null, opts: { falhaEmail?: boolean } = {}) {
  const renovados: { email: string; venceEm: Date; chave: string | null }[] = []
  const eventos: Omit<EventoLicenca, 'em'>[] = []
  const emails: EmailTesteRenovado[] = []
  const d: DepsRenovarTeste = {
    agora: () => AGORA,
    diasTeste: 10,
    buscarUsuario: async () => u,
    renovar: async (email, venceEm, chave) => {
      renovados.push({ email, venceEm, chave: chave?.chave ?? null })
    },
    enviarEmail: async (e) => {
      if (opts.falhaEmail) throw new Error('resend fora')
      emails.push(e)
    },
    evento: async (e) => { eventos.push(e) },
  }
  return { d, renovados, eventos, emails }
}

describe('novaValidadeTeste', () => {
  it('teste vencido conta 10 pregões a partir de agora', () => {
    expect(novaValidadeTeste(new Date('2026-10-01T21:30:00Z'), AGORA, 10).toISOString()).toBe(
      '2026-11-12T21:30:00.000Z',
    )
  })

  it('teste ainda vigente soma 10 pregões depois do vencimento atual', () => {
    expect(novaValidadeTeste(new Date('2026-11-12T21:30:00Z'), AGORA, 10).toISOString()).toBe(
      '2026-11-27T21:30:00.000Z',
    )
  })
})

describe('renovarTeste', () => {
  it('renova teste vencido, mantém a chave e avisa por e-mail', async () => {
    const { d, renovados, eventos, emails } = deps(
      usuario({ plan: 'trial', licenseKeyHash: 'h', trialEndsAt: new Date('2026-10-01T21:30:00Z') }),
    )
    const r = await renovarTeste('maria@exemplo.com', d)
    expect(r).toEqual({
      ok: true,
      venceEm: '2026-11-12T21:30:00.000Z',
      chave: null,
      emailEnviado: true,
    })
    expect(renovados[0]).toMatchObject({ email: 'maria@exemplo.com', chave: null })
    expect(eventos.map((e) => e.tipo)).toEqual(['teste_renovado'])
    expect(emails[0].venceEm.toISOString()).toBe('2026-11-12T21:30:00.000Z')
  })

  it('cliente sem chave recebe chave nova', async () => {
    const { d, eventos } = deps(usuario({ plan: 'trial', trialEndsAt: new Date('2026-10-01') }))
    const r = await renovarTeste('maria@exemplo.com', d)
    expect(r.ok && r.chave).toMatch(/^MEGN-/)
    expect(eventos.map((e) => e.tipo)).toEqual(['teste_renovado', 'chave_gerada'])
  })

  it('falha no e-mail não desfaz a renovação', async () => {
    const { d, renovados } = deps(usuario({ plan: 'trial', licenseKeyHash: 'h' }), { falhaEmail: true })
    const r = await renovarTeste('maria@exemplo.com', d)
    expect(r).toMatchObject({ ok: true, emailEnviado: false })
    expect(renovados).toHaveLength(1)
  })

  it('recusa inexistente, anual e vitalício', async () => {
    expect(await renovarTeste('x@x.com', deps(null).d)).toMatchObject({ ok: false })
    const anual = deps(usuario({ plan: 'anual', licenseEndsAt: new Date('2027-10-29') }))
    expect(await renovarTeste('maria@exemplo.com', anual.d)).toMatchObject({ ok: false })
    expect(anual.renovados).toHaveLength(0)
    const vitalicio = deps(usuario({ plan: 'vitalicio' }))
    expect(await renovarTeste('maria@exemplo.com', vitalicio.d)).toMatchObject({ ok: false })
  })

  it('reativa cliente de teste desativado', async () => {
    const { d, renovados } = deps(usuario({ plan: 'trial', active: false, licenseKeyHash: 'h' }))
    const r = await renovarTeste('maria@exemplo.com', d)
    expect(r).toMatchObject({ ok: true })
    expect(renovados).toHaveLength(1)
    expect(camposRenovacaoTeste(new Date('2026-11-12T21:30:00Z'), null, AGORA)).toMatchObject({
      plan: 'trial',
      active: true,
      contract: 1,
    })
  })
})

describe('e-mail da renovação', () => {
  it('fala em teste renovado e pede para só abrir a Megan', () => {
    const m = montarEmailTesteRenovado({
      para: 'maria@exemplo.com',
      nome: 'Maria',
      venceEm: new Date('2026-11-12T21:30:00Z'),
      chave: null,
    })
    expect(m.assunto).toBe('Seu teste da Megan N18 foi renovado')
    expect(m.texto).toContain('foi renovado até')
    expect(m.texto).toContain('não precisa instalar de novo')
    expect(m.texto).toContain('maria@exemplo.com')
    expect(m.html).toContain('Continue usando a mesma chave')
  })
})
