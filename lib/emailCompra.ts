import { config, obrigatoria } from './config.js'
import {
  blocoChave,
  blocoGerenciador,
  blocoTelegram,
  enviarEmail,
  escapar,
  formatarVencimento,
  PASSO_INSTALAR,
} from './email.js'
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
    'é só responder este e-mail ou falar com o suporte no grupo do Telegram. Depois desse prazo, a licença anual não tem reembolso.'
  )
}

export function montarEmailCompra({ para, nome, licencaAte, conta, chave }: EmailCompra, link: string, telegram = '') {
  const primeiro = nome.split(' ')[0]
  const ate = formatarVencimento(licencaAte)
  const gerenciador = blocoGerenciador(conta, para)
  const ativacao = blocoChave(chave)
  const grupo = blocoTelegram(telegram)
  const texto = [
    `Olá, ${primeiro}!`,
    '',
    `Pagamento confirmado. Sua licença anual da Megan N18 vale até ${ate} (horário de Brasília).`,
    'Sem limite de contratos.',
    '',
    `1. Baixe o instalador MeganN18-Setup.exe: ${link}`,
    `2. ${PASSO_INSTALAR}`,
    `3. Abra a Megan N18 pelo atalho da Área de Trabalho e entre com este e-mail (${para}) e a chave de ativação.`,
    '',
    'Se você já usa a Megan, não precisa instalar de novo: basta abrir o programa, a licença é atualizada sozinha.',
    '',
    ...ativacao.texto,
    '',
    ...gerenciador.texto,
    '',
    ...grupo.texto,
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
      <a href="${escapar(link)}" style="background:#0ea5e9;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Baixar o instalador da Megan N18</a>
    </p>
    <ol>
      <li>${escapar(PASSO_INSTALAR)}</li>
      <li>Abra a <b>Megan N18</b> pelo atalho da Área de Trabalho e entre com este e-mail (<b>${escapar(para)}</b>) e a chave de ativação.</li>
      <li>Deixe o MetaTrader 5 aberto, logado na sua corretora e com Algo Trading ligado.</li>
    </ol>
    <p>Se você já usa a Megan, não precisa instalar de novo: basta abrir o programa, a licença é atualizada sozinha.</p>
    ${ativacao.html}
    ${gerenciador.html}
    ${grupo.html}
    <p style="color:#374151;font-size:13px"><b>Cancelamento:</b> ${escapar(politicaCancelamento())}</p>
    <p style="color:#6b7280;font-size:12px">Operações em renda variável envolvem risco. Resultados passados não garantem resultados futuros.</p>
  </div>`
  return { assunto: 'Sua licença anual da Megan N18 está ativa', texto, html }
}

export async function enviarEmailCompra(dados: EmailCompra): Promise<void> {
  await enviarEmail(dados.para, montarEmailCompra(dados, obrigatoria('DOWNLOAD_URL'), config.grupoTelegram()))
}
