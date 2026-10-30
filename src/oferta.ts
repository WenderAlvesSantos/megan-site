/** Deve ser igual a TRIAL_BUSINESS_DAYS da API (lib/config.ts) */
export const DIAS_TESTE = 10

/** Só para exibição — deve ser igual a PLANO_ANUAL em lib/plano.ts (a API cobra e confere por lá) */
export const PRECO_ANUAL = 1599
export const PARCELAS_ANUAL = 12

export const precoFormatado = (valor: number) =>
  valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
