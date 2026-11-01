import { obrigatoria } from './config.js'

export interface ContaGerenciador {
  url: string
  /** null quando o e-mail já tinha conta no gerenciador: a senha atual continua valendo */
  senha: string | null
}

export interface TradeGerenciador {
  externalId: string
  date: string
  accountType: 'SIMULADOR' | 'REAL'
  asset: 'WIN' | 'WDO'
  contracts: number
  points: number
}

export type StatusTrade = 'criado' | 'duplicado' | 'sem_usuario'

function urlGerenciador(): string {
  return obrigatoria('TRADE_MANAGER_URL').replace(/\/+$/, '')
}

function postGerenciador(caminho: string, corpo: unknown): Promise<Response> {
  return fetch(`${urlGerenciador()}${caminho}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${obrigatoria('TRADE_MANAGER_API_KEY')}`,
    },
    body: JSON.stringify(corpo),
    signal: AbortSignal.timeout(10_000),
  })
}

/** Lança o trade na conta do e-mail; 404 = e-mail sem conta no gerenciador. */
export async function lancarTradeGerenciador(email: string, trade: TradeGerenciador): Promise<StatusTrade> {
  const resp = await postGerenciador('/api/integracao/trades', { email, ...trade })
  if (resp.status === 404) return 'sem_usuario'
  if (!resp.ok) throw new Error(`Gerenciador respondeu HTTP ${resp.status}`)
  const dados = (await resp.json()) as { status?: string }
  if (dados.status === 'criado' || dados.status === 'duplicado') return dados.status
  throw new Error('Resposta inesperada do gerenciador')
}

export type ContaTipo = 'SIMULADOR' | 'REAL'

export interface BancaGerenciador {
  configured: boolean
  bankroll: number
  contracts: number
  suggestedContracts: number
  maxContracts: number
  stopCostPerContract: number
  protecting: boolean
}

export interface MudancasBanca {
  /** Banca inicial em R$, valendo a partir de hoje. */
  banca?: number
  /** Contratos com que a Megan iniciou no ao vivo (vira o nível atual no gerenciador). */
  contratos?: number
}

/** Banca e contratos sugeridos do WIN na conta, depois de gravar as mudanças pedidas (se houver). */
export async function bancaGerenciador(
  email: string,
  accountType: ContaTipo,
  mudancas: MudancasBanca = {},
): Promise<BancaGerenciador | 'sem_usuario'> {
  const resp = await postGerenciador('/api/integracao/gerenciamento', {
    email,
    accountType,
    ...(mudancas.banca === undefined ? {} : { initialBankroll: mudancas.banca }),
    ...(mudancas.contratos === undefined ? {} : { contracts: mudancas.contratos }),
  })
  if (resp.status === 404) return 'sem_usuario'
  if (!resp.ok) throw new Error(`Gerenciador respondeu HTTP ${resp.status}`)
  const d = (await resp.json()) as Partial<BancaGerenciador>
  return {
    configured: Boolean(d.configured),
    bankroll: Number(d.bankroll ?? 0),
    contracts: Number(d.contracts ?? 0),
    suggestedContracts: Number(d.suggestedContracts ?? 0),
    maxContracts: Number(d.maxContracts ?? 0),
    stopCostPerContract: Number(d.stopCostPerContract ?? 0),
    protecting: Boolean(d.protecting),
  }
}

export interface ResultadoConfigGerenciador {
  aplicados: string[]
  jaTinham: string[]
  semConta: string[]
}

/** Clientes antigos: cria a configuração da Megan no gerenciador de quem ainda não tem (nada é sobrescrito). */
export async function configurarGerenciador(emails: string[]): Promise<ResultadoConfigGerenciador> {
  const resp = await postGerenciador('/api/integracao/configuracao', { emails })
  if (!resp.ok) throw new Error(`Gerenciador respondeu HTTP ${resp.status}`)
  const d = (await resp.json()) as Partial<ResultadoConfigGerenciador>
  return { aplicados: d.aplicados ?? [], jaTinham: d.jaTinham ?? [], semConta: d.semConta ?? [] }
}

export async function criarContaGerenciador(email: string): Promise<ContaGerenciador> {
  const url = urlGerenciador()
  const resp = await postGerenciador('/api/integracao/usuarios', { email })
  if (!resp.ok) throw new Error(`Gerenciador respondeu HTTP ${resp.status}`)
  const dados = (await resp.json()) as { status?: string; password?: string }
  if (dados.status === 'criado' && dados.password) return { url, senha: dados.password }
  if (dados.status === 'existente') return { url, senha: null }
  throw new Error('Resposta inesperada do gerenciador')
}
