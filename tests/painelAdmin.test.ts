import { describe, expect, it } from 'vitest'
import { configurarGerenciadorCliente, linhaCliente } from '../lib/admin.js'
import type { CompraMegan, UsuarioMegan } from '../lib/mongo.js'
import { diaBrt, lerPeriodo, montarPainel } from '../lib/painelAdmin.js'
import { statusCliente } from '../lib/statusCliente.js'

const AGORA = new Date('2026-10-31T15:00:00Z')
const d = (iso: string) => new Date(iso)

function u(email: string, extra: Partial<UsuarioMegan>): UsuarioMegan {
  return { name: email, email, active: true, contract: 1, createdAt: d('2026-10-01T12:00:00Z'), ...extra }
}

function compra(email: string, aplicadaEm?: string, valor = 1599): CompraMegan {
  return {
    _id: email + (aplicadaEm ?? ''), email, name: email, phone: '', plano: 'anual', valor, status: aplicadaEm ? 'aprovada' : 'pendente',
    criadaEm: d('2026-10-01T12:00:00Z'), ...(aplicadaEm ? { aplicadaEm: d(aplicadaEm) } : {}),
  }
}

describe('statusCliente', () => {
  it('teste, assinante, vencidos, licença antiga e desativado', () => {
    expect(statusCliente(u('a', { plan: 'trial', trialEndsAt: d('2026-11-05') }), AGORA)).toBe('teste')
    expect(statusCliente(u('a', { plan: 'trial', trialEndsAt: d('2026-10-20') }), AGORA)).toBe('teste_vencido')
    expect(statusCliente(u('a', { plan: 'anual', licenseEndsAt: d('2027-10-01') }), AGORA)).toBe('assinante')
    expect(statusCliente(u('a', { plan: 'anual', licenseEndsAt: d('2026-10-01') }), AGORA)).toBe('assinatura_vencida')
    expect(statusCliente(u('a', { contract: 200 }), AGORA)).toBe('licenca')
    expect(statusCliente(u('a', { plan: 'anual', licenseEndsAt: d('2027-10-01'), active: false }), AGORA)).toBe('desativado')
    expect(linhaCliente(u('ana@x.com', { name: 'Ana', plan: 'trial', trialEndsAt: d('2026-11-05') }), AGORA)).toEqual({
      nome: 'Ana', email: 'ana@x.com', status: 'teste',
    })
  })
})

describe('lerPeriodo', () => {
  it('padrão: últimos 30 dias por dia; agrupa por semana/mês conforme o tamanho', () => {
    expect(lerPeriodo({}, AGORA)).toEqual({ de: '2026-10-02', ate: '2026-10-31', agrupar: 'dia' })
    expect(lerPeriodo({ de: '2026-08-01', ate: '2026-10-31' }, AGORA).agrupar).toBe('semana')
    expect(lerPeriodo({ de: '2025-11-01', ate: '2026-10-31' }, AGORA).agrupar).toBe('mes')
    expect(lerPeriodo({ de: '2026-10-31', ate: '2026-10-01', agrupar: 'mes' }, AGORA)).toEqual({ de: '2026-10-01', ate: '2026-10-31', agrupar: 'mes' })
    expect(lerPeriodo({ de: 'lixo', agrupar: 'ano' }, AGORA).agrupar).toBe('dia')
  })

  it('dia no horário de Brasília (23h de BRT ainda é o mesmo dia)', () => {
    expect(diaBrt(d('2026-11-01T02:30:00Z'))).toBe('2026-10-31')
  })
})

describe('montarPainel', () => {
  const usuarios = [
    u('t1@x.com', { plan: 'trial', createdAt: d('2026-10-10T12:00:00Z'), trialStartedAt: d('2026-10-10T12:00:00Z'), trialEndsAt: d('2026-10-24') }),
    u('t2@x.com', { plan: 'trial', createdAt: d('2026-10-20T12:00:00Z'), trialStartedAt: d('2026-10-20T12:00:00Z'), trialEndsAt: d('2026-11-03') }),
    u('t1-pagou@x.com', { plan: 'anual', createdAt: d('2026-10-11T12:00:00Z'), trialStartedAt: d('2026-10-11T12:00:00Z'), licenseEndsAt: d('2027-10-25') }),
    u('antigo@x.com', { plan: 'anual', createdAt: d('2026-09-15T12:00:00Z'), licenseEndsAt: d('2027-09-20') }),
  ]
  const compras = [
    compra('t1-pagou@x.com', '2026-10-25T13:00:00Z'),
    compra('antigo@x.com', '2026-09-20T13:00:00Z'),
    compra('pendente@x.com'),
  ]
  const p = montarPainel(usuarios, compras, { de: '2026-10-01', ate: '2026-10-31', agrupar: 'semana' }, AGORA)

  it('receita, assinaturas, ticket, novos clientes, testes e conversão do período', () => {
    expect(p.kpis).toEqual({ receita: 1599, assinaturas: 1, ticketMedio: 1599, novosClientes: 3, testes: 3, conversao: 1 / 3, reembolsos: 0 })
  })

  it('compra reembolsada sai da receita e das assinaturas e conta como reembolso', () => {
    const estornada = { ...compra('t1-pagou@x.com', '2026-10-25T13:00:00Z'), reembolsadaEm: d('2026-10-27T13:00:00Z') }
    const r = montarPainel(usuarios, [estornada], { de: '2026-10-01', ate: '2026-10-31', agrupar: 'semana' }, AGORA)
    expect(r.kpis).toMatchObject({ receita: 0, assinaturas: 0, reembolsos: 1, conversao: 0 })
  })

  it('compara com o período anterior do mesmo tamanho', () => {
    expect(p.anterior).toMatchObject({ receita: 1599, assinaturas: 1, novosClientes: 1, testes: 0, conversao: null })
  })

  it('série por semana (segunda-feira) cobrindo todo o período e situação atual dos clientes', () => {
    expect(p.serie[0].chave).toBe('2026-09-28')
    expect(p.serie.at(-1)?.chave).toBe('2026-10-26')
    expect(p.serie.reduce((s, b) => s + b.receita, 0)).toBe(1599)
    // 25/10 é domingo: a venda entra na semana de segunda 19/10, junto com o teste de 20/10
    expect(p.serie.find((b) => b.chave === '2026-10-19')).toMatchObject({ testes: 1, novosClientes: 1, receita: 1599 })
    expect(p.situacao).toMatchObject({ teste: 1, teste_vencido: 1, assinante: 2 })
    expect(p.totalClientes).toBe(4)
  })
})

describe('configurarGerenciadorCliente', () => {
  it('aplica, informa quem já tinha ou não tem conta e marca como feito', async () => {
    const marcados: string[] = []
    const sobrescreveu: (boolean | undefined)[] = []
    const deps = (r: { aplicados: string[]; jaTinham: string[]; semConta: string[] }) => ({
      configurar: async (_emails: string[], sobrescrever?: boolean) => {
        sobrescreveu.push(sobrescrever)
        return r
      },
      marcar: async (e: string[]) => { marcados.push(...e) },
    })
    expect(await configurarGerenciadorCliente('a@x.com', deps({ aplicados: ['a@x.com'], jaTinham: [], semConta: [] }))).toEqual({ status: 'aplicado' })
    expect(await configurarGerenciadorCliente('b@x.com', deps({ aplicados: [], jaTinham: ['b@x.com'], semConta: [] }))).toEqual({ status: 'ja_tinha' })
    expect(await configurarGerenciadorCliente('c@x.com', deps({ aplicados: [], jaTinham: [], semConta: ['c@x.com'] }))).toEqual({ status: 'sem_conta' })
    expect(marcados).toEqual(['a@x.com', 'b@x.com', 'c@x.com'])
    expect(sobrescreveu).toEqual([true, true, true])
  })
})
