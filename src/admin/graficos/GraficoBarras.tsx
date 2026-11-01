import { LARGURA as LARGURA_PADRAO, MARGEM, mostrarRotulo, tetoEixo } from './escala'

interface Props {
  rotulos: string[]
  valores: number[]
  cor: string
  formatar: (v: number) => string
  altura?: number
  largura?: number
}

export default function GraficoBarras({ rotulos, valores, cor, formatar, altura = 220, largura: LARGURA = LARGURA_PADRAO }: Props) {
  const teto = tetoEixo(Math.max(0, ...valores))
  const areaL = LARGURA - MARGEM.esq - MARGEM.dir
  const areaA = altura - MARGEM.topo - MARGEM.base
  const passo = areaL / Math.max(valores.length, 1)
  const larg = Math.max(2, Math.min(36, passo * 0.7))
  const y = (v: number) => MARGEM.topo + areaA - (v / teto) * areaA

  return (
    <svg viewBox={`0 0 ${LARGURA} ${altura}`} className="grafico" role="img">
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <g key={f}>
          <line x1={MARGEM.esq} x2={LARGURA - MARGEM.dir} y1={y(teto * f)} y2={y(teto * f)} className="grade" />
          <text x={MARGEM.esq - 8} y={y(teto * f) + 4} className="eixo" textAnchor="end">
            {formatar(teto * f)}
          </text>
        </g>
      ))}
      {valores.map((v, i) => {
        const cx = MARGEM.esq + passo * i + passo / 2
        return (
          <g key={i} className="barra">
            <rect x={cx - larg / 2} y={y(v)} width={larg} height={Math.max(0, y(0) - y(v))} rx={3} fill={cor}>
              <title>{`${rotulos[i]}: ${formatar(v)}`}</title>
            </rect>
            {mostrarRotulo(i, valores.length) && (
              <text x={cx} y={altura - 8} className="eixo" textAnchor="middle">
                {rotulos[i]}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
