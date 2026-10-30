import { mascararEmail, pagamentoConfirma } from './compra.js'
import type { EmailCompra } from './emailCompra.js'
import type { ContaGerenciador } from './gerenciador.js'
import type { PagamentoMP } from './mercadopago.js'
import type { CompraMegan, UsuarioMegan } from './mongo.js'
import { ehLicencaSemVencimento, novaValidadeAnual } from './plano.js'

export interface DepsLiberacao {
  agora: () => Date
  buscarCompra: (id: string) => Promise<CompraMegan | null>
  /** Marca a compra como liberada só se ainda não estiver; false = outra chamada já liberou. */
  reservar: (compraId: string, pagamentoId: string, agora: Date) => Promise<boolean>
  desfazerReserva: (compraId: string) => Promise<void>
  registrarValidade: (compraId: string, licencaAte: Date) => Promise<void>
  buscarUsuario: (email: string) => Promise<UsuarioMegan | null>
  /** Cria a conta se não existir; plano anual, sem limite de contratos. */
  ativarAnual: (compra: CompraMegan, licencaAte: Date) => Promise<void>
  criarContaGerenciador: (email: string) => Promise<ContaGerenciador>
  enviarEmail: (dados: EmailCompra) => Promise<void>
  pagamentosDaCompra: (compraId: string) => Promise<PagamentoMP[]>
}

export type ResultadoLiberacao =
  | { status: 'liberada'; licencaAte: Date }
  | { status: 'ja_liberada' }
  | { status: 'sem_vencimento' }
  | { status: 'ignorado'; motivo: string }

export async function liberarCompra(p: PagamentoMP, deps: DepsLiberacao): Promise<ResultadoLiberacao> {
  const compra = await deps.buscarCompra(String(p.external_reference ?? ''))
  if (!compra) return { status: 'ignorado', motivo: 'compra não encontrada' }
  if (compra.aplicadaEm) return { status: 'ja_liberada' }
  if (!pagamentoConfirma(p, compra)) return { status: 'ignorado', motivo: `pagamento ${p.status}` }
  const agora = deps.agora()
  if (!(await deps.reservar(compra._id, String(p.id), agora))) return { status: 'ja_liberada' }

  let licencaAte: Date
  try {
    const usuario = await deps.buscarUsuario(compra.email)
    if (ehLicencaSemVencimento(usuario)) {
      console.warn('[compra] e-mail já tem licença sem vencimento; nada alterado', compra._id)
      return { status: 'sem_vencimento' }
    }
    licencaAte = novaValidadeAnual(usuario, agora)
    await deps.ativarAnual(compra, licencaAte)
  } catch (e) {
    await deps.desfazerReserva(compra._id)
    throw e
  }
  await avisarCliente(compra, licencaAte, deps)
  return { status: 'liberada', licencaAte }
}

// Licença já liberada: daqui em diante nenhuma falha pode desfazer a reserva (somaria outro ano).
async function avisarCliente(compra: CompraMegan, licencaAte: Date, deps: DepsLiberacao) {
  await deps.registrarValidade(compra._id, licencaAte).catch((e) => console.error('[compra] validade', compra._id, e))
  const conta = await deps.criarContaGerenciador(compra.email).catch((e) => {
    console.error('[compra] gerenciador', compra.email, e)
    return undefined
  })
  await deps
    .enviarEmail({ para: compra.email, nome: compra.name, licencaAte, conta })
    .catch((e) => console.error('[compra] e-mail', compra.email, e))
}

export interface SituacaoCompra {
  status: 'aprovada' | 'pendente' | 'recusada' | 'nao_encontrada'
  email?: string
  licencaAte?: string | null
}

const EM_ANDAMENTO = ['pending', 'in_process', 'authorized', 'in_mediation']

/** Tela de retorno: se o webhook ainda não chegou, consulta o Mercado Pago e libera daqui. */
export async function situacaoCompra(id: string, deps: DepsLiberacao): Promise<SituacaoCompra> {
  let compra = await deps.buscarCompra(id)
  if (!compra) return { status: 'nao_encontrada' }
  let recusada = false
  if (!compra.aplicadaEm) {
    const pags = await deps.pagamentosDaCompra(id).catch(() => [] as PagamentoMP[])
    const aprovado = pags.find((p) => pagamentoConfirma(p, compra as CompraMegan))
    if (aprovado) {
      await liberarCompra(aprovado, deps)
      compra = (await deps.buscarCompra(id)) ?? compra
    }
    recusada = pags.length > 0 && !aprovado && !pags.some((p) => EM_ANDAMENTO.includes(p.status))
  }
  const email = mascararEmail(compra.email)
  if (!compra.aplicadaEm) return { status: recusada ? 'recusada' : 'pendente', email }
  return { status: 'aprovada', email, licencaAte: compra.licencaAte ? new Date(compra.licencaAte).toISOString() : null }
}
