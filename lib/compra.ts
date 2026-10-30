import type { PagamentoMP } from './mercadopago.js'
import type { CompraMegan } from './mongo.js'
import { PLANO_ANUAL } from './plano.js'
import { validarCadastro } from './validacao.js'

export interface DepsCheckout {
  gerarId: () => string
  agora: () => Date
  salvarCompra: (c: CompraMegan) => Promise<void>
  criarPreferencia: (c: CompraMegan) => Promise<{ id: string; url: string }>
  registrarPreferencia: (compraId: string, preferenciaId: string) => Promise<void>
}

export type RespostaCheckout = { status: 'ok'; url: string } | { status: 'invalido'; mensagem: string }

export async function iniciarCompra(corpo: unknown, deps: DepsCheckout): Promise<RespostaCheckout> {
  const v = validarCadastro(corpo, 'Para continuar, aceite os termos de uso.')
  if (!v.ok) return { status: 'invalido', mensagem: v.mensagem }
  const compra: CompraMegan = {
    _id: deps.gerarId(),
    email: v.dados.email,
    name: v.dados.nome,
    phone: v.dados.telefone,
    plano: 'anual',
    valor: PLANO_ANUAL.preco,
    status: 'pendente',
    criadaEm: deps.agora(),
  }
  await deps.salvarCompra(compra)
  const pref = await deps.criarPreferencia(compra)
  await deps.registrarPreferencia(compra._id, pref.id)
  return { status: 'ok', url: pref.url }
}

/** Só o que veio da API do Mercado Pago vale: aprovado, em reais, valor cheio e da mesma compra. */
export function pagamentoConfirma(p: PagamentoMP, c: CompraMegan): boolean {
  return (
    p.status === 'approved' &&
    p.currency_id === 'BRL' &&
    String(p.external_reference ?? '') === c._id &&
    Number(p.transaction_amount) + 0.001 >= c.valor
  )
}

export function mascararEmail(email: string): string {
  const [usuario, dominio] = email.split('@')
  return `${usuario.slice(0, 2)}***@${dominio ?? ''}`
}
