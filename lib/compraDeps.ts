import { randomUUID } from 'node:crypto'
import type { DepsCheckout } from './compra.js'
import { config } from './config.js'
import { enviarEmailCompra } from './emailCompra.js'
import { criarContaGerenciador } from './gerenciador.js'
import type { DepsLiberacao } from './liberacao.js'
import { criarPreferencia, estornarPagamento, pagamentosDaCompra } from './mercadopago.js'
import { camposNovaChave } from './ativacao.js'
import { enviarEmailReembolso } from './emailReembolso.js'
import { colecaoCompras, colecaoUsuarios, registrarEvento } from './mongo.js'
import type { DepsReconciliacao } from './reconciliacao.js'
import type { DepsReembolso } from './reembolso.js'

export async function depsCheckoutReais(): Promise<DepsCheckout> {
  const compras = await colecaoCompras()
  return {
    gerarId: randomUUID,
    agora: () => new Date(),
    salvarCompra: async (c) => {
      await compras.insertOne(c)
    },
    criarPreferencia: (c) =>
      criarPreferencia({ compraId: c._id, nome: c.name, email: c.email, siteUrl: config.siteUrl() }),
    registrarPreferencia: async (id, preferenciaId) => {
      await compras.updateOne({ _id: id }, { $set: { preferenciaId } })
    },
  }
}

export async function depsLiberacaoReais(): Promise<DepsLiberacao> {
  const [compras, usuarios] = await Promise.all([colecaoCompras(), colecaoUsuarios()])
  return {
    agora: () => new Date(),
    buscarCompra: (id) => compras.findOne({ _id: id }),
    reservar: async (id, pagamentoId, agora) => {
      const r = await compras.updateOne(
        { _id: id, aplicadaEm: { $exists: false } },
        { $set: { aplicadaEm: agora, status: 'aprovada', pagamentoId } },
      )
      return r.modifiedCount === 1
    },
    desfazerReserva: async (id) => {
      await compras.updateOne({ _id: id }, { $set: { status: 'pendente' }, $unset: { aplicadaEm: '', pagamentoId: '' } })
    },
    registrarValidade: async (id, licencaAte) => {
      await compras.updateOne({ _id: id }, { $set: { licencaAte } })
    },
    buscarUsuario: (email) => usuarios.findOne({ email }),
    ativarAnual: async (c, licencaAte, chave) => {
      const agora = new Date()
      await usuarios.updateOne(
        { email: c.email },
        {
          $set: {
            plan: 'anual',
            licenseEndsAt: licencaAte,
            contract: 0,
            active: true,
            updatedAt: agora,
            ...(chave ? camposNovaChave(chave, agora) : {}),
          },
          $setOnInsert: { name: c.name, email: c.email, phone: c.phone, createdAt: agora, source: 'compra' },
        },
        { upsert: true },
      )
      if (chave) await registrarEvento({ email: c.email, tipo: 'chave_gerada', detalhe: 'compra' })
    },
    criarContaGerenciador,
    enviarEmail: enviarEmailCompra,
    pagamentosDaCompra,
  }
}

export async function depsReembolsoReais(): Promise<DepsReembolso> {
  const [compras, usuarios] = await Promise.all([colecaoCompras(), colecaoUsuarios()])
  return {
    agora: () => new Date(),
    ultimaCompraPaga: (email) => compras.findOne({ email, aplicadaEm: { $exists: true } }, { sort: { aplicadaEm: -1 } }),
    buscarCompra: (id) => compras.findOne({ _id: id }),
    estornar: estornarPagamento,
    marcarReembolsada: async (id, agora, origem) => {
      const r = await compras.updateOne(
        { _id: id, reembolsadaEm: { $exists: false } },
        { $set: { status: 'reembolsada', reembolsadaEm: agora, reembolsoOrigem: origem } },
      )
      return r.modifiedCount === 1
    },
    buscarUsuario: (email) => usuarios.findOne({ email }),
    encurtarLicenca: async (email, licencaAte) => {
      await usuarios.updateOne({ email }, { $set: { licenseEndsAt: licencaAte, updatedAt: new Date() } })
    },
    evento: registrarEvento,
    avisarCliente: enviarEmailReembolso,
  }
}

export async function depsReconciliacaoReais(): Promise<DepsReconciliacao> {
  const [base, compras] = await Promise.all([depsLiberacaoReais(), colecaoCompras()])
  return {
    ...base,
    listarPendentes: async (desde, limite) => {
      const docs = await compras
        .find({ aplicadaEm: { $exists: false }, criadaEm: { $gte: desde } }, { projection: { _id: 1 } })
        .sort({ criadaEm: -1 })
        .limit(limite)
        .toArray()
      return docs.map((d) => d._id)
    },
  }
}
