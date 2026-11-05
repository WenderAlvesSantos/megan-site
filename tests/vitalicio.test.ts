import { describe, expect, it } from 'vitest'
import type { NovaChave } from '../lib/chave.js'
import type { EmailVitalicio } from '../lib/emailVitalicio.js'
import { montarEmailVitalicio } from '../lib/emailVitalicio.js'
import { acessoGerenciador } from '../lib/acessoGerenciador.js'
import type { EventoLicenca, UsuarioMegan } from '../lib/mongo.js'
import { ehLicencaSemVencimento } from '../lib/plano.js'
import { filtroStatus, statusCliente } from '../lib/statusCliente.js'
import { liberarVitalicio, type DepsVitalicio } from '../lib/vitalicio.js'
import { AGORA, usuario } from './fakes.js'

function deps(u: UsuarioMegan | null, opts: { falhaGerenciador?: boolean; falhaEmail?: boolean; contaExistente?: boolean } = {}) {
  const liberados: { email: string; chave: NovaChave | null }[] = []
  const eventos: Omit<EventoLicenca, 'em'>[] = []
  const emails: EmailVitalicio[] = []
  const d: DepsVitalicio = {
    agora: () => AGORA,
    buscarUsuario: async () => u,
    liberar: async (email, chave) => { liberados.push({ email, chave }) },
    criarContaGerenciador: async () => {
      if (opts.falhaGerenciador) throw new Error('gerenciador fora')
      return { url: 'https://gerenciador', senha: opts.contaExistente ? null : 'Ab3dEf7h' }
    },
    enviarEmail: async (e) => {
      if (opts.falhaEmail) throw new Error('resend fora')
      emails.push(e)
    },
    evento: async (e) => { eventos.push(e) },
  }
  return { d, liberados, eventos, emails }
}

describe('liberarVitalicio', () => {
  it('cliente sem chave: gera chave, cria conta no gerenciador e avisa por e-mail', async () => {
    const { d, liberados, eventos, emails } = deps(usuario({ plan: 'trial', trialEndsAt: new Date('2026-10-01') }))
    const r = await liberarVitalicio('maria@exemplo.com', d)
    expect(r).toMatchObject({ ok: true, gerenciador: 'criada', emailEnviado: true })
    expect(r.ok && r.chave).toMatch(/^MEGN-/)
    expect(liberados[0].chave).not.toBeNull()
    expect(eventos.map((e) => e.tipo)).toEqual(['vitalicio', 'chave_gerada'])
    expect(emails[0]).toMatchObject({ para: 'maria@exemplo.com', chave: r.ok ? r.chave : '', conta: { senha: 'Ab3dEf7h' } })
  })

  it('cliente com chave mantém a chave e a conta existente', async () => {
    const { d, liberados, eventos } = deps(usuario({ plan: 'anual', licenseKeyHash: 'h' }), { contaExistente: true })
    const r = await liberarVitalicio('maria@exemplo.com', d)
    expect(r).toEqual({ ok: true, chave: null, gerenciador: 'existente', emailEnviado: true })
    expect(liberados[0].chave).toBeNull()
    expect(eventos.map((e) => e.tipo)).toEqual(['vitalicio'])
  })

  it('falha no gerenciador ou no e-mail não desfaz a liberação', async () => {
    const { d, liberados } = deps(usuario({ licenseKeyHash: 'h' }), { falhaGerenciador: true, falhaEmail: true })
    const r = await liberarVitalicio('maria@exemplo.com', d)
    expect(r).toMatchObject({ ok: true, gerenciador: 'falhou', emailEnviado: false })
    expect(liberados).toHaveLength(1)
  })

  it('recusa cliente inexistente ou já vitalício; reativa vitalício desativado', async () => {
    expect(await liberarVitalicio('x@x.com', deps(null).d)).toMatchObject({ ok: false })
    const ja = deps(usuario({ plan: 'vitalicio' }))
    expect(await liberarVitalicio('maria@exemplo.com', ja.d)).toMatchObject({ ok: false })
    expect(ja.liberados).toHaveLength(0)
    const desativado = deps(usuario({ plan: 'vitalicio', active: false, licenseKeyHash: 'h' }))
    expect(await liberarVitalicio('maria@exemplo.com', desativado.d)).toMatchObject({ ok: true })
  })
})

describe('plano vitalício', () => {
  const u = usuario({ plan: 'vitalicio', contract: 0, licenseEndsAt: new Date('2020-01-01') })

  it('libera Megan e trade-manager sem vencimento e não é tratado como licença antiga', () => {
    expect(acessoGerenciador(u, AGORA)).toEqual({ ok: true, plano: 'vitalicio', venceEm: null, mensagem: 'OK' })
    expect(ehLicencaSemVencimento(u)).toBe(true)
    expect(statusCliente(u, AGORA)).toBe('vitalicio')
    expect(filtroStatus('vitalicio', AGORA)).toEqual({ active: true, plan: 'vitalicio' })
    expect(filtroStatus('licenca', AGORA)).toEqual({ active: true, plan: { $nin: ['trial', 'anual', 'vitalicio'] } })
  })

  it('e-mail fala em acesso vitalício e traz a chave e o gerenciador', () => {
    const m = montarEmailVitalicio({ para: 'maria@exemplo.com', nome: 'Maria Lima', chave: 'MEGN-AAAA', conta: { url: 'https://g', senha: 'S3nh4' } }, 'https://dl')
    expect(m.assunto).toContain('vitalício')
    expect(m.texto).toContain('MEGN-AAAA')
    expect(m.texto).toContain('S3nh4')
    expect(m.texto).toContain('https://dl')
  })
})
