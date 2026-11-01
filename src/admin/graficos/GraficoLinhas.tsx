import { LARGURA as LARGURA_PADRAO, MARGEM, mostrarRotulo, tetoEixo } from './escala'

export interface Serie {
  nome: string
  cor: string
  valores: number[]
}

interface Props {
  rotulos: string[]
  series: Serie[]
  formatar: (v: number) => string
  altura?: number
  largura?: number
}

export default function GraficoLinhas({ rotulos, series, formatar, altura = 220, largura: LARGURA = LARGURA_PADRAO }: Props) {
  const teto = tetoEixo(Math.max(0, ...series.flatMap((s) => s.valores)))
  const areaL = LARGURA - MARGEM.esq - MARGEM.dir
  const areaA = altura - MARGEM.topo - MARGEM.base
  const n = rotulos.length
  const x = (i: number) => MARGEM.esq + (n <= 1 ? areaL / 2 : (areaL * i) / (n - 1))
  const y = (v: number) => MARGEM.topo + areaA - (v / teto) * areaA

  return (
    <div>
      <svg viewBox={`0 0 ${LARGURA} ${altura}`} className="grafico" role="img">
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={MARGEM.esq} x2={LARGURA - MARGEM.dir} y1={y(teto * f)} y2={y(teto * f)} className="grade" />
            <text x={MARGEM.esq - 8} y={y(teto * f) + 4} className="eixo" textAnchor="end">
              {formatar(teto * f)}
            </text>
          </g>
        ))}
        {rotulos.map((r, i) =>
          mostrarRotulo(i, n) ? (
            <text key={r} x={x(i)} y={altura - 8} className="eixo" textAnchor="middle">
              {r}
            </text>
          ) : null,
        )}
        {series.map((s) => (
          <g key={s.nome}>
            <polyline
              points={s.valores.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
              fill="none"
              stroke={s.cor}
              strokeWidth={2.5}
              strokeLinejoin="round"
            />
            {s.valores.map((v, i) => (
              <circle key={i} cx={x(i)} cy={y(v)} r={n > 40 ? 2 : 3.5} fill={s.cor} className="ponto">
                <title>{`${s.nome} · ${rotulos[i]}: ${formatar(v)}`}</title>
              </circle>
            ))}
          </g>
        ))}
      </svg>
      <ul className="legenda">
        {series.map((s) => (
          <li key={s.nome}>
            <span style={{ background: s.cor }} />
            {s.nome}
          </li>
        ))}
      </ul>
    </div>
  )
}
