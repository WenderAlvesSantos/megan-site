export interface Fatia {
  rotulo: string
  valor: number
  cor: string
}

interface Props {
  fatias: Fatia[]
  centro: string
  legendaCentro: string
}

const RAIO = 70
const ESPESSURA = 22
const CIRC = 2 * Math.PI * RAIO

export default function GraficoRosca({ fatias, centro, legendaCentro }: Props) {
  const total = fatias.reduce((s, f) => s + f.valor, 0)
  let acumulado = 0
  return (
    <div className="rosca">
      <svg viewBox="0 0 180 180" className="grafico rosca-svg" role="img">
        <circle cx={90} cy={90} r={RAIO} fill="none" stroke="#1e2a4a" strokeWidth={ESPESSURA} />
        {total > 0 &&
          fatias.map((f) => {
            const tam = (f.valor / total) * CIRC
            const offset = -acumulado
            acumulado += tam
            return f.valor > 0 ? (
              <circle
                key={f.rotulo}
                cx={90}
                cy={90}
                r={RAIO}
                fill="none"
                stroke={f.cor}
                strokeWidth={ESPESSURA}
                strokeDasharray={`${tam} ${CIRC - tam}`}
                strokeDashoffset={offset}
                transform="rotate(-90 90 90)"
                className="fatia"
              >
                <title>{`${f.rotulo}: ${f.valor} (${Math.round((f.valor / total) * 100)}%)`}</title>
              </circle>
            ) : null
          })}
        <text x={90} y={88} textAnchor="middle" className="rosca-centro">
          {centro}
        </text>
        <text x={90} y={108} textAnchor="middle" className="eixo">
          {legendaCentro}
        </text>
      </svg>
      <ul className="legenda legenda-coluna">
        {fatias.map((f) => (
          <li key={f.rotulo}>
            <span style={{ background: f.cor }} />
            {f.rotulo}
            <b>{f.valor}</b>
            <small>{total ? `${Math.round((f.valor / total) * 100)}%` : '0%'}</small>
          </li>
        ))}
      </ul>
    </div>
  )
}
