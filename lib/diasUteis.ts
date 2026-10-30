// Pregões da B3: fins de semana e feriados sem negociação ficam fora da contagem.
const FERIADOS_B3 = new Set<string>([
  // 2026
  '2026-01-01', '2026-02-16', '2026-02-17', '2026-04-03', '2026-04-21', '2026-05-01',
  '2026-06-04', '2026-09-07', '2026-10-12', '2026-11-02', '2026-11-20', '2026-12-24',
  '2026-12-25', '2026-12-31',
  // 2027
  '2027-01-01', '2027-02-08', '2027-02-09', '2027-03-26', '2027-04-21', '2027-05-27',
  '2027-09-07', '2027-10-12', '2027-11-02', '2027-11-15', '2027-12-24', '2027-12-31',
])

const OFFSET_BRASILIA_MS = -3 * 60 * 60 * 1000
const HORA_FIM_PREGAO = 18
const MINUTO_FIM_PREGAO = 30
const UM_DIA_MS = 24 * 60 * 60 * 1000

function diaBrasilia(instante: Date): Date {
  const local = new Date(instante.getTime() + OFFSET_BRASILIA_MS)
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()))
}

export function ehPregao(dia: Date): boolean {
  const semana = dia.getUTCDay()
  return semana !== 0 && semana !== 6 && !FERIADOS_B3.has(dia.toISOString().slice(0, 10))
}

/**
 * Fim do teste: 18:30 (Brasília) do N-ésimo pregão. O dia do cadastro conta
 * quando é pregão e o cadastro acontece antes do fechamento.
 */
export function fimDoTeste(inicio: Date, diasUteis: number): Date {
  let dia = diaBrasilia(inicio)
  const local = new Date(inicio.getTime() + OFFSET_BRASILIA_MS)
  const minutos = local.getUTCHours() * 60 + local.getUTCMinutes()
  let contados = ehPregao(dia) && minutos < HORA_FIM_PREGAO * 60 + MINUTO_FIM_PREGAO ? 1 : 0
  while (contados < diasUteis) {
    dia = new Date(dia.getTime() + UM_DIA_MS)
    if (ehPregao(dia)) contados += 1
  }
  return new Date(
    Date.UTC(dia.getUTCFullYear(), dia.getUTCMonth(), dia.getUTCDate(), HORA_FIM_PREGAO, MINUTO_FIM_PREGAO) -
      OFFSET_BRASILIA_MS,
  )
}
