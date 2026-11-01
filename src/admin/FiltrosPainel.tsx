import { diaAtras } from './formato'

export interface FiltroPainel {
  de: string
  ate: string
  agrupar: '' | 'dia' | 'semana' | 'mes'
}

export const ATALHOS = [
  { rotulo: '7 dias', dias: 7 },
  { rotulo: '30 dias', dias: 30 },
  { rotulo: '90 dias', dias: 90 },
  { rotulo: '12 meses', dias: 365 },
]

export const filtroDosUltimos = (dias: number): FiltroPainel => ({ de: diaAtras(dias - 1), ate: diaAtras(0), agrupar: '' })

interface Props {
  filtro: FiltroPainel
  onMudar: (f: FiltroPainel) => void
  ocupado: boolean
}

export default function FiltrosPainel({ filtro, onMudar, ocupado }: Props) {
  const ativo = ATALHOS.find((a) => filtro.de === diaAtras(a.dias - 1) && filtro.ate === diaAtras(0))
  return (
    <div className="painel-filtros">
      <div className="segmentos" role="group" aria-label="Período">
        {ATALHOS.map((a) => (
          <button
            key={a.dias}
            type="button"
            className={ativo === a ? 'ativo' : ''}
            onClick={() => onMudar({ ...filtroDosUltimos(a.dias), agrupar: filtro.agrupar })}
            disabled={ocupado}
          >
            {a.rotulo}
          </button>
        ))}
      </div>
      <label>
        De
        <input type="date" value={filtro.de} max={filtro.ate} onChange={(e) => e.target.value && onMudar({ ...filtro, de: e.target.value })} />
      </label>
      <label>
        Até
        <input type="date" value={filtro.ate} min={filtro.de} onChange={(e) => e.target.value && onMudar({ ...filtro, ate: e.target.value })} />
      </label>
      <label>
        Agrupar
        <select value={filtro.agrupar} onChange={(e) => onMudar({ ...filtro, agrupar: e.target.value as FiltroPainel['agrupar'] })}>
          <option value="">Automático</option>
          <option value="dia">Por dia</option>
          <option value="semana">Por semana</option>
          <option value="mes">Por mês</option>
        </select>
      </label>
    </div>
  )
}
