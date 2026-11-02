import { describe, expect, it } from 'vitest'
import { montarEmailTeste } from '../lib/email.js'
import { montarEmailCompra } from '../lib/emailCompra.js'
import { validarCadastro } from '../lib/validacao.js'
import { mascararTelefone } from '../src/telefone.js'

const GRUPO = 'https://t.me/+meganN18'

describe('máscara do celular', () => {
  it('formata enquanto digita e limita a 11 dígitos', () => {
    expect(mascararTelefone('1')).toBe('(1')
    expect(mascararTelefone('11')).toBe('(11')
    expect(mascararTelefone('119')).toBe('(11) 9')
    expect(mascararTelefone('1191234')).toBe('(11) 91234')
    expect(mascararTelefone('11912345678')).toBe('(11) 91234-5678')
    expect(mascararTelefone('1134567890')).toBe('(11) 3456-7890')
    expect(mascararTelefone('(11) 91234-56789999')).toBe('(11) 91234-5678')
    expect(mascararTelefone('')).toBe('')
  })

  it('o banco recebe só os dígitos', () => {
    const r = validarCadastro({ nome: 'Ana Lima', email: 'ana@x.com', telefone: '(11) 91234-5678', aceite: true, website: '' })
    expect(r.ok && r.dados.telefone).toBe('11912345678')
    expect(validarCadastro({ nome: 'Ana Lima', email: 'ana@x.com', telefone: '(11) 9', aceite: true }).ok).toBe(false)
  })
})

describe('grupo do Telegram nos e-mails', () => {
  it('teste e assinatura levam o link do grupo', () => {
    const teste = montarEmailTeste({ para: 'a@b.com', nome: 'Ana', venceEm: new Date(), chave: 'MEGN-AAAA-BBBB-CCCC-DDDD' }, 'https://drive/x', GRUPO)
    const compra = montarEmailCompra({ para: 'a@b.com', nome: 'Ana', licencaAte: new Date(), chave: null }, 'https://drive/x', GRUPO)
    for (const m of [teste, compra]) {
      expect(m.texto).toContain(`Grupo: ${GRUPO}`)
      expect(m.html).toContain(`href="${GRUPO}"`)
      expect(m.html).toContain('Entrar no grupo do Telegram')
    }
  })

  it('sem link configurado o bloco não aparece', () => {
    const m = montarEmailTeste({ para: 'a@b.com', nome: 'Ana', venceEm: new Date(), chave: 'MEGN-AAAA-BBBB-CCCC-DDDD' }, 'https://drive/x')
    expect(m.texto).not.toContain('Telegram')
    expect(m.html).not.toContain('Telegram')
  })
})
