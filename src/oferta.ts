/** Deve ser igual a TRIAL_BUSINESS_DAYS da API (lib/config.ts) */
export const DIAS_TESTE = 10

/** Só para exibição — deve ser igual a PLANO_ANUAL em lib/plano.ts (a API cobra e confere por lá) */
export const PRECO_ANUAL = 1599
export const PARCELAS_ANUAL = 12

/** Deve ser igual a PRAZO_ARREPENDIMENTO_DIAS em lib/reembolso.ts (direito de arrependimento, CDC art. 49) */
export const DIAS_ARREPENDIMENTO = 7

export const POLITICA_CANCELAMENTO = `Você pode desistir da compra em até ${DIAS_ARREPENDIMENTO} dias após a aprovação do pagamento e recebe 100% do valor de volta. Depois desse prazo, a licença anual não tem reembolso.`

export const precoFormatado = (valor: number) =>
  valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
