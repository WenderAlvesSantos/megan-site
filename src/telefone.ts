/** Máscara do celular enquanto digita: (11) 91234-5678 / (11) 3456-7890. A API grava só os dígitos. */
export function mascararTelefone(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  const ddd = `(${d.slice(0, 2)}) `
  const resto = d.slice(2)
  // Celular (começa com 9) tem 5 dígitos antes do traço; fixo, 4
  const corte = d.length === 11 || resto.startsWith('9') ? 5 : 4
  if (resto.length <= corte) return ddd + resto
  return `${ddd}${resto.slice(0, corte)}-${resto.slice(corte)}`
}
