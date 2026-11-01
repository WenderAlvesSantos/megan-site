import { porcento, variacao } from './formato'

interface Props {
  titulo: string
  valor: string
  atual?: number
  anterior?: number
  dica?: string
  extra?: string
}

/** Indicador com a variação contra o período anterior de mesmo tamanho. */
export default function CartaoKpi({ titulo, valor, atual, anterior, dica, extra }: Props) {
  const v = atual === undefined || anterior === undefined ? undefined : variacao(atual, anterior)
  const classe = v === undefined || v === null || v === 0 ? 'neutra' : v > 0 ? 'sobe' : 'desce'
  return (
    <article className="kpi" title={dica}>
      <span className="kpi-titulo">{titulo}</span>
      <strong className="kpi-valor">{valor}</strong>
      {extra && <span className="kpi-extra">{extra}</span>}
      {v !== undefined && (
        <span className={`kpi-variacao ${classe}`}>
          {v === null ? 'novo no período' : `${v > 0 ? '▲' : v < 0 ? '▼' : '•'} ${porcento(Math.abs(v))} vs. período anterior`}
        </span>
      )}
    </article>
  )
}
