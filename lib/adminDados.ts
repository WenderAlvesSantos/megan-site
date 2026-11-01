import type { Filter } from 'mongodb'
import { linhaCliente, resumoCliente, type ClienteAdmin, type ClienteLinha, type DepsConfigGerenciador } from './admin.js'
import { configurarGerenciador } from './gerenciador.js'
import { colecaoCompras, colecaoEventos, colecaoUsuarios, type UsuarioMegan } from './mongo.js'
import { lerPeriodo, montarPainel, type Painel } from './painelAdmin.js'
import { ehStatusCliente, filtroStatus } from './statusCliente.js'

export const POR_PAGINA = 20

const escaparRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export interface PaginaClientes {
  clientes: ClienteLinha[]
  total: number
  pagina: number
  porPagina: number
}

/** Lista paginada (mais recentes primeiro), com busca por nome/e-mail e filtro de status. */
export async function listarClientes(q: Record<string, unknown>): Promise<PaginaClientes> {
  const usuarios = await colecaoUsuarios()
  const agora = new Date()
  const termo = String(q.q ?? '').trim()
  const filtros: Filter<UsuarioMegan>[] = []
  if (termo) {
    const re = new RegExp(escaparRegex(termo), 'i')
    filtros.push({ $or: [{ email: re }, { name: re }] })
  }
  if (ehStatusCliente(q.status)) filtros.push(filtroStatus(q.status, agora))
  const filtro: Filter<UsuarioMegan> = filtros.length ? { $and: filtros } : {}
  const total = await usuarios.countDocuments(filtro)
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA))
  const pagina = Math.min(Math.max(1, Number.parseInt(String(q.pagina ?? '1'), 10) || 1), paginas)
  const lista = await usuarios
    .find(filtro)
    .sort({ createdAt: -1 })
    .skip((pagina - 1) * POR_PAGINA)
    .limit(POR_PAGINA)
    .toArray()
  return { clientes: lista.map((u) => linhaCliente(u, agora)), total, pagina, porPagina: POR_PAGINA }
}

export async function detalheCliente(email: string): Promise<ClienteAdmin | null> {
  const [usuarios, eventos, compras] = await Promise.all([colecaoUsuarios(), colecaoEventos(), colecaoCompras()])
  const u = await usuarios.findOne({ email })
  if (!u) return null
  const [evs, compra] = await Promise.all([
    eventos.find({ email }).sort({ em: -1 }).limit(10).toArray(),
    compras.findOne({ email, aplicadaEm: { $exists: true } }, { sort: { aplicadaEm: -1 } }),
  ])
  return resumoCliente(u, evs, new Date(), compra)
}

const CAMPOS_PAINEL = { email: 1, name: 1, active: 1, plan: 1, createdAt: 1, trialStartedAt: 1, trialEndsAt: 1, licenseEndsAt: 1 }

export async function dadosPainel(q: Record<string, unknown>): Promise<Painel> {
  const [usuarios, compras] = await Promise.all([colecaoUsuarios(), colecaoCompras()])
  const agora = new Date()
  const [listaUsuarios, pagas] = await Promise.all([
    usuarios.find({}, { projection: CAMPOS_PAINEL }).toArray(),
    compras
      .find({ aplicadaEm: { $exists: true } }, { projection: { email: 1, valor: 1, aplicadaEm: 1, reembolsadaEm: 1 } })
      .toArray(),
  ])
  return montarPainel(listaUsuarios, pagas, lerPeriodo(q, agora), agora)
}

export async function depsConfigGerenciador(): Promise<DepsConfigGerenciador> {
  const usuarios = await colecaoUsuarios()
  const semConfig = { gerenciadorConfigAt: { $exists: false } }
  return {
    pendentes: async (limite) =>
      (await usuarios.find(semConfig, { projection: { email: 1 } }).sort({ createdAt: 1 }).limit(limite).toArray()).map((u) => u.email),
    contarPendentes: () => usuarios.countDocuments(semConfig),
    configurar: configurarGerenciador,
    marcar: async (emails) => {
      await usuarios.updateMany({ email: { $in: emails } }, { $set: { gerenciadorConfigAt: new Date() } })
    },
  }
}
