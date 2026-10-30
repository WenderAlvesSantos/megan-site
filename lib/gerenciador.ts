import { obrigatoria } from './config.js'

export interface ContaGerenciador {
  url: string
  /** null quando o e-mail já tinha conta no gerenciador: a senha atual continua valendo */
  senha: string | null
}

export async function criarContaGerenciador(email: string): Promise<ContaGerenciador> {
  const url = obrigatoria('TRADE_MANAGER_URL').replace(/\/+$/, '')
  const resp = await fetch(`${url}/api/integracao/usuarios`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${obrigatoria('TRADE_MANAGER_API_KEY')}`,
    },
    body: JSON.stringify({ email }),
    signal: AbortSignal.timeout(10_000),
  })
  if (!resp.ok) throw new Error(`Gerenciador respondeu HTTP ${resp.status}`)
  const dados = (await resp.json()) as { status?: string; password?: string }
  if (dados.status === 'criado' && dados.password) return { url, senha: dados.password }
  if (dados.status === 'existente') return { url, senha: null }
  throw new Error('Resposta inesperada do gerenciador')
}
