import { verificarAtivacao } from './ativacao.js'
import type { StatusTrade, TradeGerenciador } from './gerenciador.js'
import type { UsuarioMegan } from './mongo.js'

export interface DepsLancamento {
  buscar: (email: string) => Promise<UsuarioMegan | null>
  enviar: (email: string, trade: TradeGerenciador) => Promise<StatusTrade>
}

export type ResultadoLancamento =
  | { ok: true; status: StatusTrade }
  | { ok: false; status: 'invalido' | 'recusado'; mensagem: string }

const DATA_RE = /^\d{4}-\d{2}-\d{2}$/
const ID_RE = /^[a-f0-9]{16,64}$/

/** Confere o trade enviado pela Megan (só WIN, conta Simulador ou Real). */
export function validarTrade(bruto: unknown): TradeGerenciador | null {
  const t = (bruto ?? {}) as Record<string, unknown>
  const externalId = String(t.externalId ?? '').toLowerCase()
  const date = String(t.date ?? '')
  const accountType = String(t.accountType ?? '')
  const contracts = Number(t.contracts)
  const points = Number(t.points)
  if (!ID_RE.test(externalId) || !DATA_RE.test(date)) return null
  if (accountType !== 'SIMULADOR' && accountType !== 'REAL') return null
  if (t.asset !== 'WIN') return null
  if (!Number.isInteger(contracts) || contracts < 1 || contracts > 10_000) return null
  if (!Number.isFinite(points) || Math.abs(points) > 100_000) return null
  return { externalId, date, accountType, asset: 'WIN', contracts, points }
}

export const LICENCA_NAO_CONFERE = 'Licença não confere para este computador.'

/** Prova de licença da Megan: e-mail + chave de ativação + o computador onde ela já foi ativada. */
export function licencaConfere(u: UsuarioMegan | null, chave: unknown, maquina: string): boolean {
  const a = u ? verificarAtivacao(u, chave, maquina) : null
  return Boolean(a?.ok && !a.vincular)
}

export async function lancarTrade(
  email: string,
  chave: unknown,
  maquina: string,
  bruto: unknown,
  deps: DepsLancamento,
): Promise<ResultadoLancamento> {
  const trade = validarTrade(bruto)
  if (!trade) return { ok: false, status: 'invalido', mensagem: 'Trade inválido.' }
  if (!licencaConfere(await deps.buscar(email), chave, maquina)) {
    return { ok: false, status: 'recusado', mensagem: LICENCA_NAO_CONFERE }
  }
  return { ok: true, status: await deps.enviar(email, trade) }
}
