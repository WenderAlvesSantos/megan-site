export type StatusCliente = 'teste' | 'assinante' | 'teste_vencido' | 'assinatura_vencida' | 'licenca' | 'desativado'
export type Agrupamento = 'dia' | 'semana' | 'mes'

export interface ClienteLinha {
  nome: string
  email: string
  status: StatusCliente
}

export interface ClienteAdmin extends ClienteLinha {
  telefone: string
  plano: string
  ativo: boolean
  liberado: boolean
  contratos: number
  venceEm: string | null
  cadastradoEm: string | null
  origem: string
  chaveFinal: string | null
  chaveGeradaEm: string | null
  vinculadaEm: string | null
  ultimaConsulta: string | null
  gerenciadorConfigEm: string | null
  eventos: { tipo: string; em: string; detalhe?: string }[]
}

export interface PaginaClientes {
  clientes: ClienteLinha[]
  total: number
  pagina: number
  porPagina: number
}

export interface Kpis {
  receita: number
  assinaturas: number
  ticketMedio: number
  novosClientes: number
  testes: number
  conversao: number | null
}

export interface Balde {
  chave: string
  receita: number
  assinaturas: number
  novosClientes: number
  testes: number
}

export interface Painel {
  periodo: { de: string; ate: string; agrupar: Agrupamento }
  kpis: Kpis
  anterior: Kpis
  serie: Balde[]
  situacao: Record<StatusCliente, number>
  totalClientes: number
}

export class ErroAdmin extends Error {
  constructor(readonly status: number, mensagem: string) {
    super(mensagem)
  }
}

async function chamar<T>(senha: string, init: RequestInit & { query?: Record<string, string> } = {}): Promise<T> {
  const qs = init.query ? `?${new URLSearchParams(init.query)}` : ''
  const resp = await fetch(`/api/admin${qs}`, {
    ...init,
    headers: { Authorization: `Bearer ${senha}`, 'Content-Type': 'application/json' },
  })
  const corpo = (await resp.json().catch(() => ({}))) as T & { erro?: string; mensagem?: string }
  if (!resp.ok) throw new ErroAdmin(resp.status, corpo.erro || corpo.mensagem || `Erro ${resp.status}`)
  return corpo
}

const acao = <T>(senha: string, corpo: Record<string, string>) =>
  chamar<T>(senha, { method: 'POST', body: JSON.stringify(corpo) })

export const listarClientes = (senha: string, filtros: { q: string; status: string; pagina: number }) =>
  chamar<PaginaClientes>(senha, { query: { q: filtros.q, status: filtros.status, pagina: String(filtros.pagina) } })

export const detalheCliente = (senha: string, email: string) =>
  chamar<{ cliente: ClienteAdmin }>(senha, { query: { email } }).then((r) => r.cliente)

export const carregarPainel = (senha: string, filtros: { de: string; ate: string; agrupar: string }) =>
  chamar<Painel>(senha, { query: { visao: 'painel', ...filtros } })

export const novaChave = (senha: string, email: string) =>
  acao<{ ok: true; chave: string; emailEnviado: boolean }>(senha, { acao: 'nova-chave', email })

export const configGerenciadorCliente = (senha: string, email: string) =>
  acao<{ status: 'aplicado' | 'ja_tinha' | 'sem_conta' }>(senha, { acao: 'config-gerenciador-cliente', email })

export const configGerenciador = (senha: string) =>
  acao<{ aplicados: number; jaTinham: number; semConta: string[]; restantes: number }>(senha, { acao: 'config-gerenciador' })

export const gerarFaltantes = (senha: string) =>
  acao<{ geradas: number; restantes: number; semEmail: string[] }>(senha, { acao: 'gerar-faltantes' })
