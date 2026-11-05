import type { UsuarioMegan } from './mongo.js'

/** Única fonte do preço: o front exibe estes valores e a API cobra e confere por eles. */
export const PLANO_ANUAL = {
  id: 'megan-n18-anual',
  titulo: 'Megan N18 — Licença anual',
  descricao: 'Licença de 1 ano do robô Megan N18 para MetaTrader 5 no mini-índice (WIN)',
  /** Categoria de item do Mercado Pago (produto digital); melhora a análise antifraude. */
  categoria: 'virtual_goods',
  preco: 1599,
  parcelas: 12,
} as const

/** Planos com vencimento controlado pela API (os demais, como 'licenca', não vencem). */
export const PLANOS_COM_VENCIMENTO = ['trial', 'anual'] as const

/** Acesso liberado pelo suporte, sem pagamento e sem vencimento (Megan e trade-manager). */
export const PLANO_VITALICIO = 'vitalicio'

export function ehLicencaSemVencimento(u: UsuarioMegan | null): boolean {
  return !!u && !(PLANOS_COM_VENCIMENTO as readonly string[]).includes(u.plan || 'licenca')
}

export function somarUmAno(d: Date): Date {
  const r = new Date(d)
  r.setUTCFullYear(r.getUTCFullYear() + 1)
  return r
}

/** Renovação soma 1 ano ao vencimento ainda vigente; senão conta a partir de agora. */
export function novaValidadeAnual(u: UsuarioMegan | null, agora: Date): Date {
  const atual = u?.plan === 'anual' && u.licenseEndsAt ? new Date(u.licenseEndsAt) : null
  return somarUmAno(atual && atual.getTime() > agora.getTime() ? atual : agora)
}
