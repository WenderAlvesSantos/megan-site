import type { EmailCompra } from '../lib/emailCompra.js'
import type { DepsLiberacao } from '../lib/liberacao.js'
import type { PagamentoMP } from '../lib/mercadopago.js'
import type { CompraMegan, UsuarioMegan } from '../lib/mongo.js'

export const AGORA = new Date('2026-10-29T15:00:00Z')
export const ID = '11111111-2222-3333-4444-555555555555'

export const usuario = (extra: Partial<UsuarioMegan>): UsuarioMegan => ({
  name: 'Maria', email: 'maria@exemplo.com', active: true, contract: 1, createdAt: AGORA, ...extra,
})

export const pagamento = (extra: Partial<PagamentoMP> = {}): PagamentoMP => ({
  id: 987, status: 'approved', currency_id: 'BRL', transaction_amount: 1599, external_reference: ID, ...extra,
})

export interface OpcoesBanco {
  usuario?: UsuarioMegan | null
  falhaAtivar?: boolean
  falhaGerenciador?: boolean
  pagamentos?: PagamentoMP[]
}

/** Uma compra pendente (ID) em memória, com as dependências da liberação. */
export function banco(opts: OpcoesBanco = {}) {
  const compra: CompraMegan = {
    _id: ID, email: 'maria@exemplo.com', name: 'Maria da Silva', phone: '11912345678',
    plano: 'anual', valor: 1599, status: 'pendente', criadaEm: AGORA,
  }
  const ativacoes: Date[] = []
  const emails: EmailCompra[] = []
  const d: DepsLiberacao = {
    agora: () => AGORA,
    buscarCompra: async (id) => (id === ID ? { ...compra } : null),
    reservar: async (_id, pagamentoId, agora) => {
      if (compra.aplicadaEm) return false
      Object.assign(compra, { aplicadaEm: agora, status: 'aprovada', pagamentoId })
      return true
    },
    desfazerReserva: async () => {
      Object.assign(compra, { aplicadaEm: undefined, status: 'pendente', pagamentoId: undefined })
    },
    registrarValidade: async (_id, ate) => { compra.licencaAte = ate },
    buscarUsuario: async () => opts.usuario ?? null,
    ativarAnual: async (_c, ate) => {
      if (opts.falhaAtivar) throw new Error('mongo fora')
      ativacoes.push(ate)
    },
    criarContaGerenciador: async () => {
      if (opts.falhaGerenciador) throw new Error('gerenciador fora')
      return { url: 'https://gerenciador', senha: 'Ab3dEf7h' }
    },
    enviarEmail: async (e) => { emails.push(e) },
    pagamentosDaCompra: async () => opts.pagamentos ?? [],
  }
  return { d, compra, ativacoes, emails }
}
