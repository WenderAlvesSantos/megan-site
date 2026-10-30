import { MongoClient, type Collection } from 'mongodb'
import { obrigatoria } from './config.js'

export interface UsuarioMegan {
  name: string
  email: string
  phone?: string
  active: boolean
  contract: number
  plan?: string
  trialStartedAt?: Date
  trialEndsAt?: Date
  licenseEndsAt?: Date
  createdAt: Date
  updatedAt?: Date
  source?: string
}

export interface CompraMegan {
  _id: string
  email: string
  name: string
  phone: string
  plano: 'anual'
  valor: number
  status: 'pendente' | 'aprovada'
  criadaEm: Date
  preferenciaId?: string
  pagamentoId?: string
  /** preenchido uma única vez, ao liberar a licença (trava contra webhook repetido) */
  aplicadaEm?: Date
  licencaAte?: Date
}

// Reaproveitada entre invocações da mesma instância serverless.
const cache = globalThis as unknown as { _meganMongo?: Promise<MongoClient> }

async function banco() {
  if (!cache._meganMongo) {
    const conexao = new MongoClient(obrigatoria('MONGODB_URI'), { serverSelectionTimeoutMS: 8000 }).connect()
    cache._meganMongo = conexao
    conexao.catch(() => {
      cache._meganMongo = undefined
    })
  }
  return (await cache._meganMongo).db('megan')
}

export async function colecaoUsuarios(): Promise<Collection<UsuarioMegan>> {
  return (await banco()).collection<UsuarioMegan>('users')
}

export async function colecaoCompras(): Promise<Collection<CompraMegan>> {
  return (await banco()).collection<CompraMegan>('purchases')
}
