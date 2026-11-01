import { obrigatoria } from './config.js'
import { blocoChave, blocoGerenciador, enviarEmail, escapar, formatarVencimento } from './email.js'
import type { ContaGerenciador } from './gerenciador.js'
import { PRAZO_ARREPENDIMENTO_DIAS } from './reembolso.js'

export interface EmailCompra {
  para: string
  nome: string
  licencaAte: Date
  conta?: ContaGerenciador
  /** chave nova (cliente sem chave); null = cliente já tem chave e continua com ela */
  chave: string | null
}

/** Direito de arrependimento: prazo contado da aprovação (hoje, no envio deste e-mail). */
function politicaCancelamento(agora = new Date()): string {
  const ate = formatarVencimento(new Date(agora.getTime() + PRAZO_ARREPENDIMENTO_DIAS * 86_400_000))
  return (
    `você pode desistir em até ${PRAZO_ARREPENDIMENTO_DIAS} dias (até ${ate}) e recebe 100% do valor de volta — ` +
    'é só responder este e-mail ou falar com o suporte. Depois desse prazo, a licença anual não tem reembolso.'
  )
}

export function montarEmailCompra({ para, nome, licencaAte, conta, chave }: EmailCompra, link: string) {
  const primeiro = nome.split(' ')[0]
  const ate = formatarVencimento(licencaAte)
  const gerenciador = blocoGerenciador(conta, para)
  const ativacao = blocoChave(chave)
  const texto = [
    `Olá, ${primeiro}!`,
    '',
    `Pagamento confirmado. Sua licença anual da Megan N18 vale até ${ate} (horário de Brasília).`,
    'Sem limite de contratos.',
    '',
    `1. Baixe o MeganN18.zip: ${link}`,
    '2. Extraia a pasta inteira (não abra o .exe de dentro do .zip).',
    `3. Abra o MeganN18.exe e entre com este e-mail (${para}) e a chave de ativação.`,
    '',
    'Se você já usa a Megan, basta abrir o programa: a licença é atualizada sozinha.',
    '',
    ...ativacao.texto,
    '',
    ...gerenciador.texto,
    '',
    `Cancelamento: ${politicaCancelamento()}`,
    '',
    'Obrigado pela confiança e bons trades!',
    'Equipe Megan',
  ].join('\n')
  const html = `
  <div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:auto;color:#111827">
    <h2 style="color:#0284c7">Sua licença anual da Megan está ativa</h2>
    <p>Olá, ${escapar(primeiro)}!</p>
    <p>Pagamento confirmado. Você pode usar a Megan N18 até <b>${escapar(ate)}</b> (horário de Brasília), sem limite de contratos.</p>
    <p style="margin:24px 0">
      <a href="${escapar(link)}" style="background:#0ea5e9;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Baixar MeganN18.zip</a>
    </p>
    <ol>
      <li>Extraia a pasta inteira (não abra o .exe de dentro do .zip).</li>
      <li>Abra o <b>MeganN18.exe</b> e entre com este e-mail (<b>${escapar(para)}</b>) e a chave de ativação.</li>
      <li>Deixe o MetaTrader 5 aberto, logado na sua corretora e com Algo Trading ligado.</li>
    </ol>
    <p>Se você já usa a Megan, basta abrir o programa: a licença é atualizada sozinha.</p>
    ${ativacao.html}
    ${gerenciador.html}
    <p style="color:#374151;font-size:13px"><b>Cancelamento:</b> ${escapar(politicaCancelamento())}</p>
    <p style="color:#6b7280;font-size:12px">Operações em renda variável envolvem risco. Resultados passados não garantem resultados futuros.</p>
  </div>`
  return { assunto: 'Sua licença anual da Megan N18 está ativa', texto, html }
}

export async function enviarEmailCompra(dados: EmailCompra): Promise<void> {
  await enviarEmail(dados.para, montarEmailCompra(dados, obrigatoria('DOWNLOAD_URL')))
}
