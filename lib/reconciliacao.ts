import { situacaoCompra, type DepsLiberacao } from './liberacao.js'

export interface DepsReconciliacao extends DepsLiberacao {
  /** Ids das compras ainda não liberadas criadas a partir de `desde`, mais recentes primeiro. */
  listarPendentes: (desde: Date, limite: number) => Promise<string[]>
}

export interface ResultadoReconciliacao {
  verificadas: number
  liberadas: number
  falhas: number
}

const DIAS = 7
const LIMITE = 30
const LOTE = 5

/** Rede de segurança do webhook: libera compras pagas cujo aviso do Mercado Pago se perdeu. */
export async function reconciliarPendentes(deps: DepsReconciliacao): Promise<ResultadoReconciliacao> {
  const desde = new Date(deps.agora().getTime() - DIAS * 86_400_000)
  const ids = await deps.listarPendentes(desde, LIMITE)
  const r: ResultadoReconciliacao = { verificadas: ids.length, liberadas: 0, falhas: 0 }
  for (let i = 0; i < ids.length; i += LOTE) {
    const lote = await Promise.allSettled(ids.slice(i, i + LOTE).map((id) => situacaoCompra(id, deps)))
    for (const [k, s] of lote.entries()) {
      if (s.status === 'rejected') {
        r.falhas += 1
        console.error('[reconciliar] compra', ids[i + k], s.reason)
      } else if (s.value.status === 'aprovada') {
        r.liberadas += 1
      }
    }
  }
  return r
}
