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
  /** sha256 da chave de ativação (a chave em si nunca é gravada) */
  licenseKeyHash?: string
  /** últimos 4 caracteres, para o suporte conferir com o cliente */
  licenseKeyHint?: string
  licenseKeyCreatedAt?: Date
  /** máquina onde a chave foi ativada; vazio = ainda não ativada */
  machineId?: string
  machineBoundAt?: Date
  lastCheckAt?: Date
  /** quando o /admin passou este cliente pela rotina de configuração da Megan no trade-manager */
  gerenciadorConfigAt?: Date
  createdAt: Date
  updatedAt?: Date
  source?: string
}

export interface EventoLicenca {
  email: string
  tipo: 'chave_gerada' | 'ativada' | 'outra_maquina' | 'chave_invalida'
  em: Date
  maquina?: string
  detalhe?: string
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

export async function colecaoEventos(): Promise<Collection<EventoLicenca>> {
  return (await banco()).collection<EventoLicenca>('license_events')
}

/** Grava o histórico da licença sem nunca derrubar a resposta principal. */
export async function registrarEvento(e: Omit<EventoLicenca, 'em'>): Promise<void> {
  try {
    await (await colecaoEventos()).insertOne({ ...e, em: new Date() })
  } catch (err) {
    console.error('[evento] falha ao gravar', e.tipo, e.email, err)
  }
}
