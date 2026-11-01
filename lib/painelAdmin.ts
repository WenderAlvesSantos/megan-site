import type { CompraMegan, UsuarioMegan } from './mongo.js'
import { STATUS_CLIENTE, statusCliente, type StatusCliente } from './statusCliente.js'

export type Agrupamento = 'dia' | 'semana' | 'mes'

/** Datas em YYYY-MM-DD (horário de Brasília), ambas inclusivas. */
export interface PeriodoPainel {
  de: string
  ate: string
  agrupar: Agrupamento
}

export interface Kpis {
  receita: number
  assinaturas: number
  ticketMedio: number
  novosClientes: number
  testes: number
  /** Dos testes iniciados no período, fração que já comprou (null = nenhum teste no período). */
  conversao: number | null
}

export interface Balde {
  chave: string
  receita: number
  assinaturas: number
  novosClientes: number
  testes: number
}

export interface Painel {
  periodo: PeriodoPainel
  kpis: Kpis
  anterior: Kpis
  serie: Balde[]
  situacao: Record<StatusCliente, number>
  totalClientes: number
}

const DIA_MS = 86_400_000
const BRT_MS = 3 * 3_600_000 // Brasília sem horário de verão (UTC−3)
const DATA_RE = /^\d{4}-\d{2}-\d{2}$/
const MAX_DIAS = 731

export const diaBrt = (d: Date) => new Date(new Date(d).getTime() - BRT_MS).toISOString().slice(0, 10)
const somarDias = (dia: string, n: number) => new Date(Date.parse(`${dia}T00:00:00Z`) + n * DIA_MS).toISOString().slice(0, 10)
const diasEntre = (de: string, ate: string) => Math.round((Date.parse(ate) - Date.parse(de)) / DIA_MS)

function chaveBalde(dia: string, agrupar: Agrupamento): string {
  if (agrupar === 'mes') return dia.slice(0, 7)
  if (agrupar === 'semana') {
    const semana = new Date(`${dia}T00:00:00Z`).getUTCDay() // 0 = domingo
    return somarDias(dia, -((semana + 6) % 7)) // segunda-feira da semana
  }
  return dia
}

export const agrupamentoPadrao = (dias: number): Agrupamento => (dias <= 31 ? 'dia' : dias <= 180 ? 'semana' : 'mes')

/** Filtros da URL → período válido (padrão: últimos 30 dias até hoje; no máximo 2 anos). */
export function lerPeriodo(q: Record<string, unknown>, agora: Date): PeriodoPainel {
  const hoje = diaBrt(agora)
  let ate = DATA_RE.test(String(q.ate)) ? String(q.ate) : hoje
  let de = DATA_RE.test(String(q.de)) ? String(q.de) : somarDias(ate, -29)
  if (de > ate) [de, ate] = [ate, de]
  if (diasEntre(de, ate) > MAX_DIAS) de = somarDias(ate, -MAX_DIAS)
  const agrupar = ['dia', 'semana', 'mes'].includes(String(q.agrupar))
    ? (String(q.agrupar) as Agrupamento)
    : agrupamentoPadrao(diasEntre(de, ate) + 1)
  return { de, ate, agrupar }
}

const noPeriodo = (d: Date | undefined, de: string, ate: string) => {
  if (!d) return false
  const dia = diaBrt(d)
  return dia >= de && dia <= ate
}

function kpisDe(usuarios: UsuarioMegan[], pagas: CompraMegan[], de: string, ate: string, compradores: Set<string>): Kpis {
  const vendas = pagas.filter((c) => noPeriodo(c.aplicadaEm, de, ate))
  const receita = vendas.reduce((s, c) => s + (Number(c.valor) || 0), 0)
  const testes = usuarios.filter((u) => noPeriodo(u.trialStartedAt, de, ate))
  return {
    receita,
    assinaturas: vendas.length,
    ticketMedio: vendas.length ? receita / vendas.length : 0,
    novosClientes: usuarios.filter((u) => noPeriodo(u.createdAt, de, ate)).length,
    testes: testes.length,
    conversao: testes.length ? testes.filter((u) => compradores.has(u.email)).length / testes.length : null,
  }
}

export function montarPainel(usuarios: UsuarioMegan[], compras: CompraMegan[], periodo: PeriodoPainel, agora: Date): Painel {
  const { de, ate, agrupar } = periodo
  const pagas = compras.filter((c) => c.aplicadaEm)
  const compradores = new Set(pagas.map((c) => c.email))

  const baldes = new Map<string, Balde>()
  for (let dia = de; dia <= ate; dia = somarDias(dia, 1)) {
    const chave = chaveBalde(dia, agrupar)
    if (!baldes.has(chave)) baldes.set(chave, { chave, receita: 0, assinaturas: 0, novosClientes: 0, testes: 0 })
  }
  const balde = (d: Date | undefined) => (noPeriodo(d, de, ate) ? baldes.get(chaveBalde(diaBrt(d as Date), agrupar)) : undefined)
  for (const c of pagas) {
    const b = balde(c.aplicadaEm)
    if (b) {
      b.receita += Number(c.valor) || 0
      b.assinaturas += 1
    }
  }
  for (const u of usuarios) {
    const novo = balde(u.createdAt)
    if (novo) novo.novosClientes += 1
    const teste = balde(u.trialStartedAt)
    if (teste) teste.testes += 1
  }

  const situacao = Object.fromEntries(STATUS_CLIENTE.map((s) => [s, 0])) as Record<StatusCliente, number>
  for (const u of usuarios) situacao[statusCliente(u, agora)] += 1

  const tamanho = diasEntre(de, ate) + 1
  const antesAte = somarDias(de, -1)
  return {
    periodo,
    kpis: kpisDe(usuarios, pagas, de, ate, compradores),
    anterior: kpisDe(usuarios, pagas, somarDias(antesAte, -(tamanho - 1)), antesAte, compradores),
    serie: [...baldes.values()],
    situacao,
    totalClientes: usuarios.length,
  }
}
