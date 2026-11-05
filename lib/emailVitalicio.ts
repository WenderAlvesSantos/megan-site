import { config, obrigatoria } from './config.js'
import { blocoChave, blocoGerenciador, blocoTelegram, enviarEmail, escapar, PASSO_INSTALAR } from './email.js'
import type { ContaGerenciador } from './gerenciador.js'

export interface EmailVitalicio {
  para: string
  nome: string
  conta?: ContaGerenciador
  /** chave nova (cliente sem chave); null = cliente já tem chave e continua com ela */
  chave: string | null
}

export function montarEmailVitalicio({ para, nome, conta, chave }: EmailVitalicio, link: string, telegram = '') {
  const primeiro = nome.split(' ')[0] || 'cliente'
  const gerenciador = blocoGerenciador(conta, para)
  const ativacao = blocoChave(chave)
  const grupo = blocoTelegram(telegram)
  const intro = 'Seu acesso vitalício à Megan N18 e ao Megan Trade Manager foi liberado. Ele não vence e não tem limite de contratos.'
  const texto = [
    `Olá, ${primeiro}!`,
    '',
    intro,
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
    'Bons trades!',
    'Equipe Megan',
  ].join('\n')
  const html = `
  <div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:auto;color:#111827">
    <h2 style="color:#0284c7">Seu acesso vitalício à Megan está liberado</h2>
    <p>Olá, ${escapar(primeiro)}!</p>
    <p>${escapar(intro)}</p>
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
    <p style="color:#6b7280;font-size:12px">Operações em renda variável envolvem risco. Resultados passados não garantem resultados futuros.</p>
  </div>`
  return { assunto: 'Seu acesso vitalício à Megan N18 está liberado', texto, html }
}

export async function enviarEmailVitalicio(dados: EmailVitalicio): Promise<void> {
  await enviarEmail(dados.para, montarEmailVitalicio(dados, obrigatoria('DOWNLOAD_URL'), config.grupoTelegram()))
}
