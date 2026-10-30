function inteiro(nome: string, padrao: number): number {
  const v = Number.parseInt(String(process.env[nome] ?? ''), 10)
  return Number.isFinite(v) && v >= 0 ? v : padrao
}

export function obrigatoria(nome: string): string {
  const v = String(process.env[nome] ?? '').trim()
  if (!v) throw new Error(`Variável de ambiente ${nome} não configurada`)
  return v
}

export const config = {
  diasTeste: () => inteiro('TRIAL_BUSINESS_DAYS', 10),
  contratosTeste: () => inteiro('TRIAL_CONTRACTS', 1),
  contato: () => String(process.env.CONTATO_SUPORTE ?? '').trim(),
  siteUrl: () => obrigatoria('SITE_URL').replace(/\/+$/, ''),
}
