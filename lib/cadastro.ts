import { camposNovaChave } from './ativacao.js'
import { gerarChave } from './chave.js'
import { fimDoTeste } from './diasUteis.js'
import type { EmailTeste } from './email.js'
import type { ContaGerenciador } from './gerenciador.js'
import { CONTRATOS_TESTE } from './licenca.js'
import type { UsuarioMegan } from './mongo.js'
import { validarCadastro } from './validacao.js'

export interface DepsCadastro {
  buscar: (email: string) => Promise<UsuarioMegan | null>
  /** false quando o e-mail já existe (índice único) */
  inserir: (doc: UsuarioMegan) => Promise<boolean>
  criarContaGerenciador: (email: string) => Promise<ContaGerenciador>
  enviarEmail: (dados: EmailTeste) => Promise<void>
  agora: () => Date
  diasTeste: number
}

export interface RespostaCadastro {
  status: 'criado' | 'existente' | 'invalido'
  mensagem: string
  venceEm?: string
  emailEnviado?: boolean
  contaGerenciador?: boolean
}

async function contaNoGerenciador(email: string, deps: DepsCadastro): Promise<ContaGerenciador | undefined> {
  try {
    return await deps.criarContaGerenciador(email)
  } catch (e) {
    console.error('[teste] falha ao criar conta no gerenciador', email, e)
    return undefined
  }
}

export async function processarCadastro(corpo: unknown, deps: DepsCadastro): Promise<RespostaCadastro> {
  const v = validarCadastro(corpo)
  if (!v.ok) return { status: 'invalido', mensagem: v.mensagem }
  const { nome, email, telefone } = v.dados

  const jaExiste: RespostaCadastro = {
    status: 'existente',
    mensagem: 'Este e-mail já tem cadastro na Megan. O teste gratuito é liberado uma única vez por e-mail.',
  }
  if (await deps.buscar(email)) return jaExiste

  const agora = deps.agora()
  const venceEm = fimDoTeste(agora, deps.diasTeste)
  const nova = gerarChave()
  const gravou = await deps.inserir({
    ...camposNovaChave(nova, agora),
    name: nome,
    email,
    phone: telefone,
    active: true,
    contract: CONTRATOS_TESTE,
    plan: 'trial',
    trialStartedAt: agora,
    trialEndsAt: venceEm,
    createdAt: agora,
    source: 'site',
  })
  if (!gravou) return jaExiste

  const conta = await contaNoGerenciador(email, deps)
  let emailEnviado = true
  try {
    await deps.enviarEmail({ para: email, nome, venceEm, conta, chave: nova.chave })
  } catch (e) {
    emailEnviado = false
    console.error('[teste] falha ao enviar e-mail', email, e)
  }
  return {
    status: 'criado',
    mensagem: emailEnviado
      ? `Enviamos o link de download para ${email}.`
      : 'Seu teste foi liberado, mas o e-mail não pôde ser enviado agora. Fale com o suporte para receber o link e a chave de ativação.',
    venceEm: venceEm.toISOString(),
    emailEnviado,
    contaGerenciador: conta !== undefined,
  }
}
