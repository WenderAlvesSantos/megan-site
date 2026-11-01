import type { BancaGerenciador, ContaTipo, MudancasBanca } from './gerenciador.js'
import { LICENCA_NAO_CONFERE, licencaConfere } from './lancamentoTrade.js'
import type { UsuarioMegan } from './mongo.js'

export interface DepsBanca {
  buscar: (email: string) => Promise<UsuarioMegan | null>
  consultar: (email: string, conta: ContaTipo, mudancas: MudancasBanca) => Promise<BancaGerenciador | 'sem_usuario'>
}

export type ResultadoBanca =
  | { ok: true; status: 'ok'; banca: BancaGerenciador }
  | { ok: true; status: 'sem_usuario' }
  | { ok: false; status: 'invalido' | 'recusado'; mensagem: string }

const presente = (v: unknown) => v !== undefined && v !== null

/** Conta (Real/Simulador) e, se vieram, a banca em R$ (até centavos) e os contratos com que a Megan iniciou. */
export function validarPedidoBanca(corpo: Record<string, unknown>): ({ conta: ContaTipo } & MudancasBanca) | null {
  const conta = String(corpo.accountType ?? '')
  if (conta !== 'SIMULADOR' && conta !== 'REAL') return null
  const pedido: { conta: ContaTipo } & MudancasBanca = { conta }
  if (presente(corpo.banca)) {
    const banca = Math.round(Number(corpo.banca) * 100) / 100
    if (!Number.isFinite(banca) || banca <= 0 || banca > 100_000_000) return null
    pedido.banca = banca
  }
  if (presente(corpo.contratos)) {
    const contratos = Number(corpo.contratos)
    if (!Number.isInteger(contratos) || contratos < 1 || contratos > 10_000) return null
    pedido.contratos = contratos
  }
  if (corpo.confirmarBanca === true) pedido.confirmar = true
  return pedido
}

/** A Megan consulta a sugestão de contratos, sincroniza a banca ou informa os contratos com que iniciou. */
export async function bancaMegan(
  email: string,
  chave: unknown,
  maquina: string,
  corpo: Record<string, unknown>,
  deps: DepsBanca,
): Promise<ResultadoBanca> {
  const pedido = validarPedidoBanca(corpo)
  if (!pedido) return { ok: false, status: 'invalido', mensagem: 'Informe uma banca válida.' }
  if (!licencaConfere(await deps.buscar(email), chave, maquina)) {
    return { ok: false, status: 'recusado', mensagem: LICENCA_NAO_CONFERE }
  }
  const { conta, ...mudancas } = pedido
  const r = await deps.consultar(email, conta, mudancas)
  return r === 'sem_usuario' ? { ok: true, status: 'sem_usuario' } : { ok: true, status: 'ok', banca: r }
}
