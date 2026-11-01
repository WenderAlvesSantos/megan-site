import type { Agrupamento, StatusCliente } from './apiAdmin'

export const STATUS: Record<StatusCliente, { rotulo: string; cor: string }> = {
  teste: { rotulo: 'Em teste', cor: '#22d3ee' },
  assinante: { rotulo: 'Assinante', cor: '#34d399' },
  teste_vencido: { rotulo: 'Teste vencido', cor: '#fbbf24' },
  assinatura_vencida: { rotulo: 'Assinatura vencida', cor: '#f87171' },
  licenca: { rotulo: 'Licença antiga', cor: '#a78bfa' },
  desativado: { rotulo: 'Desativado', cor: '#64748b' },
}

export const ORDEM_STATUS = Object.keys(STATUS) as StatusCliente[]

const TZ = 'America/Sao_Paulo'

export const moeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
export const moedaCurta = (v: number) =>
  v >= 1000 ? `R$ ${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : moeda(v)
export const inteiro = (v: number) => v.toLocaleString('pt-BR')
export const porcento = (v: number | null) => (v === null ? '—' : `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`)

export const dataHora = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { timeZone: TZ, dateStyle: 'short', timeStyle: 'short' }) : '—'
export const data = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: TZ }) : '—')

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** Rótulo curto do balde do gráfico: 31/10 (dia), sem 26/10 (semana), out/26 (mês). */
export function rotuloBalde(chave: string, agrupar: Agrupamento): string {
  if (agrupar === 'mes') return `${MESES[Number(chave.slice(5, 7)) - 1]}/${chave.slice(2, 4)}`
  const dm = `${chave.slice(8, 10)}/${chave.slice(5, 7)}`
  return agrupar === 'semana' ? `sem ${dm}` : dm
}

/** Variação contra o período anterior; null quando não há base para comparar. */
export function variacao(atual: number, anterior: number): number | null {
  if (anterior === 0) return atual === 0 ? 0 : null
  return (atual - anterior) / anterior
}

/** Data de hoje (Brasília) menos `dias`, em YYYY-MM-DD. */
export function diaAtras(dias: number): string {
  const hoje = new Date().toLocaleDateString('en-CA', { timeZone: TZ })
  return new Date(Date.parse(`${hoje}T00:00:00Z`) - dias * 86_400_000).toISOString().slice(0, 10)
}
