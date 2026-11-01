/** Teto "redondo" do eixo Y (1, 2, 2,5, 5 × 10ⁿ) para as linhas de grade ficarem legíveis. */
export function tetoEixo(max: number): number {
  if (max <= 0) return 1
  const base = 10 ** Math.floor(Math.log10(max))
  const passo = [1, 2, 2.5, 5, 10].find((m) => m * base >= max) ?? 10
  return passo * base
}

/** Mostra no máximo ~`limite` rótulos no eixo X (sempre o primeiro e o último). */
export function mostrarRotulo(i: number, total: number, limite = 10): boolean {
  if (total <= limite) return true
  const passo = Math.ceil(total / limite)
  return i === total - 1 || (i % passo === 0 && total - 1 - i >= passo / 2)
}

/** Largura do desenho (viewBox): maior nos cartões largos para os textos não crescerem ao esticar. */
export const LARGURA = 640
export const LARGURA_LARGA = 1100
export const MARGEM = { topo: 12, dir: 12, base: 28, esq: 64 }
