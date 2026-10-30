export interface DadosCadastro {
  nome: string
  email: string
  telefone: string
  aceite: boolean
  website: string
}

export interface RespostaCadastro {
  status: 'criado' | 'existente' | 'invalido' | 'erro'
  mensagem: string
  venceEm?: string
  emailEnviado?: boolean
}

export type RespostaCheckout = { status: 'ok'; url: string } | { status: 'invalido' | 'erro'; mensagem: string }

export interface SituacaoCompra {
  status: 'aprovada' | 'pendente' | 'recusada' | 'nao_encontrada'
  email?: string
  licencaAte?: string | null
}

const SEM_CONEXAO = 'Sem conexão com o servidor. Verifique sua internet e tente de novo.'

async function postar<T extends { status: string }>(url: string, dados: unknown, falha: string): Promise<T | { status: 'erro'; mensagem: string }> {
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    })
    const corpo = (await resp.json().catch(() => null)) as T | null
    if (corpo && corpo.status) return corpo
    return { status: 'erro', mensagem: falha }
  } catch {
    return { status: 'erro', mensagem: SEM_CONEXAO }
  }
}

export async function enviarCadastro(dados: DadosCadastro): Promise<RespostaCadastro> {
  return (await postar<RespostaCadastro>(
    '/api/teste',
    dados,
    'Não foi possível concluir o cadastro. Tente novamente em instantes.',
  )) as RespostaCadastro
}

export async function iniciarCheckout(dados: DadosCadastro): Promise<RespostaCheckout> {
  return (await postar<RespostaCheckout>(
    '/api/checkout',
    dados,
    'Não foi possível abrir o pagamento. Tente novamente em instantes.',
  )) as RespostaCheckout
}

export async function consultarCompra(id: string): Promise<SituacaoCompra> {
  try {
    const resp = await fetch(`/api/compra?id=${encodeURIComponent(id)}`, { cache: 'no-store' })
    const corpo = (await resp.json().catch(() => null)) as SituacaoCompra | null
    return corpo?.status ? corpo : { status: 'pendente' }
  } catch {
    return { status: 'pendente' }
  }
}
