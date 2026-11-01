import { describe, expect, it } from 'vitest'
import { processarCadastro, type DepsCadastro } from '../lib/cadastro.js'
import { hashChave } from '../lib/chave.js'
import { montarEmailTeste, type EmailTeste } from '../lib/email.js'
import type { UsuarioMegan } from '../lib/mongo.js'

const URL_GERENCIADOR = 'https://gerenciador.exemplo.com'

function deps(existente: UsuarioMegan | null = null, falhaEmail = false, duplicado = false, falhaGerenciador = false) {
  const inseridos: UsuarioMegan[] = []
  const emails: EmailTeste[] = []
  const contas: string[] = []
  const d: DepsCadastro = {
    buscar: async () => existente,
    inserir: async (doc) => {
      if (duplicado) return false
      inseridos.push(doc)
      return true
    },
    criarContaGerenciador: async (email) => {
      if (falhaGerenciador) throw new Error('gerenciador fora')
      contas.push(email)
      return { url: URL_GERENCIADOR, senha: 'Ab3dEf7h' }
    },
    enviarEmail: async (dados) => {
      if (falhaEmail) throw new Error('resend fora')
      emails.push(dados)
    },
    agora: () => new Date('2026-10-29T13:00:00Z'),
    diasTeste: 10,
  }
  return { d, inseridos, emails, contas }
}

const valido = { nome: '  Maria   da Silva ', email: ' Maria@Exemplo.com ', telefone: '(11) 91234-5678', aceite: true, website: '' }
const CHAVE = 'MEGN-ABCD-EFGH-JKMN-PQRS'

describe('processarCadastro', () => {
  it('cria usuário trial, conta no gerenciador e envia o e-mail com a senha', async () => {
    const { d, inseridos, emails, contas } = deps()
    const r = await processarCadastro(valido, d)
    expect(r.status).toBe('criado')
    expect(r.emailEnviado).toBe(true)
    expect(r.contaGerenciador).toBe(true)
    expect(contas).toEqual(['maria@exemplo.com'])
    expect(emails).toHaveLength(1)
    expect(emails[0]).toMatchObject({ para: 'maria@exemplo.com', conta: { url: URL_GERENCIADOR, senha: 'Ab3dEf7h' } })
    expect(inseridos).toHaveLength(1)
    const u = inseridos[0]
    expect(u).toMatchObject({ name: 'Maria da Silva', email: 'maria@exemplo.com', phone: '11912345678', active: true, contract: 1, plan: 'trial', source: 'site' })
    expect(u.trialEndsAt?.toISOString()).toBe('2026-11-12T21:30:00.000Z')
    expect(r.venceEm).toBe('2026-11-12T21:30:00.000Z')
  })

  it('gera a chave de ativação: o e-mail leva a chave e o banco só o hash', async () => {
    const { d, inseridos, emails } = deps()
    await processarCadastro(valido, d)
    const chave = emails[0].chave
    expect(chave).toMatch(/^MEGN-[0-9A-HJKMNP-TV-Z]{4}(-[0-9A-HJKMNP-TV-Z]{4}){3}$/)
    expect(inseridos[0].licenseKeyHash).toBe(hashChave(chave))
    expect(inseridos[0].licenseKeyHint).toBe(chave.slice(-4))
    expect(JSON.stringify(inseridos[0])).not.toContain(chave)
    expect(inseridos[0].machineId).toBeUndefined()
  })

  it('não renova teste de e-mail já cadastrado nem mexe no gerenciador', async () => {
    const { d, inseridos, emails, contas } = deps({ name: 'X', email: 'maria@exemplo.com', active: true, contract: 0, createdAt: new Date() })
    const r = await processarCadastro(valido, d)
    expect(r.status).toBe('existente')
    expect(inseridos).toHaveLength(0)
    expect(emails).toHaveLength(0)
    expect(contas).toHaveLength(0)
  })

  it('libera o teste e envia o download mesmo se o gerenciador falhar', async () => {
    const { d, inseridos, emails } = deps(null, false, false, true)
    const r = await processarCadastro(valido, d)
    expect(r.status).toBe('criado')
    expect(r.contaGerenciador).toBe(false)
    expect(inseridos).toHaveLength(1)
    expect(emails).toHaveLength(1)
    expect(emails[0].conta).toBeUndefined()
  })

  it('recusa dados inválidos, robô e sem aceite', async () => {
    for (const corpo of [
      { ...valido, email: 'sem-arroba' },
      { ...valido, nome: 'Jo' },
      { ...valido, telefone: '1234' },
      { ...valido, aceite: false },
      { ...valido, website: 'http://spam' },
      null,
    ]) {
      const { d, inseridos } = deps()
      expect((await processarCadastro(corpo, d)).status).toBe('invalido')
      expect(inseridos).toHaveLength(0)
    }
  })

  it('cadastro simultâneo do mesmo e-mail (índice único) vira "existente" sem e-mail', async () => {
    const { d, emails } = deps(null, false, true)
    const r = await processarCadastro(valido, d)
    expect(r.status).toBe('existente')
    expect(emails).toHaveLength(0)
  })

  it('libera o teste mesmo se o e-mail falhar', async () => {
    const { d, inseridos } = deps(null, true)
    const r = await processarCadastro(valido, d)
    expect(r.status).toBe('criado')
    expect(r.emailEnviado).toBe(false)
    expect(inseridos).toHaveLength(1)
  })
})

describe('montarEmailTeste', () => {
  it('leva a chave de ativação e a regra de um computador', () => {
    const m = montarEmailTeste({ para: 'a@b.com', nome: 'Ana', venceEm: new Date(), chave: CHAVE }, 'https://drive/x')
    for (const corpo of [m.texto, m.html]) expect(corpo).toContain(CHAVE)
    expect(m.texto).toContain('vinculada a esse computador')
  })

  it('leva link, vencimento e escapa o nome', () => {
    const m = montarEmailTeste({ para: 'a@b.com', nome: '<b>Ana</b> Lima', venceEm: new Date('2026-11-19T21:30:00Z'), chave: CHAVE }, 'https://drive/x')
    expect(m.texto).toContain('https://drive/x')
    expect(m.texto).toContain('19/11/2026')
    expect(m.html).toContain('&lt;b&gt;Ana&lt;/b&gt;')
    expect(m.html).not.toContain('<b>Ana</b>')
  })

  it('leva link, login e senha do gerenciador', () => {
    const conta = { url: URL_GERENCIADOR, senha: 'Ab3dEf7h' }
    const m = montarEmailTeste({ para: 'a@b.com', nome: 'Ana', venceEm: new Date('2026-11-19T21:30:00Z'), conta, chave: CHAVE }, 'https://drive/x')
    for (const corpo of [m.texto, m.html]) {
      expect(corpo).toContain(URL_GERENCIADOR)
      expect(corpo).toContain('Ab3dEf7h')
    }
    expect(m.texto).toContain('E-mail: a@b.com')
  })

  it('conta já existente no gerenciador: sem senha nova', () => {
    const conta = { url: URL_GERENCIADOR, senha: null }
    const m = montarEmailTeste({ para: 'a@b.com', nome: 'Ana', venceEm: new Date(), conta, chave: CHAVE }, 'https://drive/x')
    expect(m.texto).toContain('a senha que você já usa')
    expect(m.texto).not.toContain('Senha:')
  })

  it('sem conta no gerenciador avisa que o suporte envia o acesso', () => {
    const m = montarEmailTeste({ para: 'a@b.com', nome: 'Ana', venceEm: new Date(), chave: CHAVE }, 'https://drive/x')
    expect(m.texto).toContain('enviado pelo suporte')
  })
})
