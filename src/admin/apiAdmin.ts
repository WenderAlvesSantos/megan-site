export interface ClienteAdmin {
  nome: string
  email: string
  telefone: string
  plano: string
  ativo: boolean
  liberado: boolean
  venceEm: string | null
  chaveFinal: string | null
  chaveGeradaEm: string | null
  vinculadaEm: string | null
  ultimaConsulta: string | null
  eventos: { tipo: string; em: string; detalhe?: string }[]
}

export class ErroAdmin extends Error {
  constructor(readonly status: number, mensagem: string) {
    super(mensagem)
  }
}

async function chamar<T>(senha: string, init: RequestInit & { query?: string } = {}): Promise<T> {
  const resp = await fetch(`/api/admin${init.query ?? ''}`, {
    ...init,
    headers: { Authorization: `Bearer ${senha}`, 'Content-Type': 'application/json' },
  })
  const corpo = (await resp.json().catch(() => ({}))) as T & { erro?: string; mensagem?: string }
  if (!resp.ok) throw new ErroAdmin(resp.status, corpo.erro || corpo.mensagem || `Erro ${resp.status}`)
  return corpo
}

export const buscarClientes = (senha: string, q: string) =>
  chamar<{ clientes: ClienteAdmin[] }>(senha, { query: `?q=${encodeURIComponent(q)}` }).then((r) => r.clientes)

export const novaChave = (senha: string, email: string) =>
  chamar<{ ok: true; chave: string; emailEnviado: boolean }>(senha, {
    method: 'POST',
    body: JSON.stringify({ acao: 'nova-chave', email }),
  })

export const configGerenciador = (senha: string) =>
  chamar<{ aplicados: number; jaTinham: number; semConta: string[]; restantes: number }>(senha, {
    method: 'POST',
    body: JSON.stringify({ acao: 'config-gerenciador' }),
  })

export const gerarFaltantes = (senha: string) =>
  chamar<{ geradas: number; restantes: number; semEmail: string[] }>(senha, {
    method: 'POST',
    body: JSON.stringify({ acao: 'gerar-faltantes' }),
  })
