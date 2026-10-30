import { Resend } from 'resend'
import { obrigatoria } from './config.js'
import type { ContaGerenciador } from './gerenciador.js'

export interface EmailTeste {
  para: string
  nome: string
  venceEm: Date
  /** ausente quando a conta no gerenciador não pôde ser criada */
  conta?: ContaGerenciador
}

export function formatarVencimento(d: Date): string {
  return d.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function escapar(texto: string): string {
  const mapa: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
  return texto.replace(/[&<>"']/g, (c) => mapa[c])
}

export function blocoGerenciador(conta: ContaGerenciador | undefined, para: string) {
  const titulo = 'Megan Trade Manager (gerenciamento de risco)'
  if (!conta) {
    const aviso = 'Seu acesso ao gerenciamento de risco será enviado pelo suporte.'
    return { texto: [titulo, aviso], html: `<h3>${titulo}</h3><p>${aviso}</p>` }
  }
  const url = escapar(conta.url)
  if (conta.senha === null) {
    const aviso = 'Entre com este e-mail e a senha que você já usa.'
    return {
      texto: [titulo, `Acesse ${conta.url}`, aviso],
      html: `<h3>${titulo}</h3><p>Acesse <a href="${url}">${url}</a>. ${aviso}</p>`,
    }
  }
  return {
    texto: [titulo, `Acesse ${conta.url}`, `E-mail: ${para}`, `Senha: ${conta.senha}`],
    html: `<h3>${titulo}</h3>
    <p>Acesse <a href="${url}">${url}</a> com:</p>
    <p>E-mail: <b>${escapar(para)}</b><br>Senha: <b style="font-family:Consolas,monospace;font-size:16px">${escapar(conta.senha)}</b></p>`,
  }
}

export function montarEmailTeste({ nome, venceEm, para, conta }: EmailTeste, link: string) {
  const primeiro = nome.split(' ')[0]
  const vence = formatarVencimento(venceEm)
  const gerenciador = blocoGerenciador(conta, para)
  const texto = [
    `Olá, ${primeiro}!`,
    '',
    `Seu teste da Megan N18 está liberado até ${vence} (horário de Brasília).`,
    '',
    `1. Baixe o MeganN18.zip: ${link}`,
    '2. Extraia a pasta inteira (não abra o .exe de dentro do .zip).',
    `3. Abra o MeganN18.exe e entre com este e-mail: ${para}`,
    '',
    'Requisitos: Windows 64 bits, internet e MetaTrader 5 aberto, logado na sua corretora e com Algo Trading ligado.',
    'Comece em modo simulado (PAPER/Replay) até se sentir seguro.',
    '',
    ...gerenciador.texto,
    '',
    'Bons trades!',
    'Equipe Megan',
  ].join('\n')
  const html = `
  <div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:auto;color:#111827">
    <h2 style="color:#0284c7">Seu teste da Megan está liberado</h2>
    <p>Olá, ${escapar(primeiro)}!</p>
    <p>Você pode usar a Megan N18 até <b>${escapar(vence)}</b> (horário de Brasília).</p>
    <p style="margin:24px 0">
      <a href="${escapar(link)}" style="background:#0ea5e9;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Baixar MeganN18.zip</a>
    </p>
    <ol>
      <li>Extraia a pasta inteira (não abra o .exe de dentro do .zip).</li>
      <li>Abra o <b>MeganN18.exe</b> e entre com este e-mail: <b>${escapar(para)}</b>.</li>
      <li>Deixe o MetaTrader 5 aberto, logado na sua corretora e com Algo Trading ligado.</li>
    </ol>
    <p>Comece em modo simulado (PAPER/Replay) até se sentir seguro.</p>
    ${gerenciador.html}
    <p style="color:#6b7280;font-size:12px">Operações em renda variável envolvem risco. Resultados passados não garantem resultados futuros.</p>
  </div>`
  return { assunto: 'Seu teste da Megan N18 está liberado', texto, html }
}

export async function enviarEmail(para: string, m: { assunto: string; texto: string; html: string }): Promise<void> {
  const resend = new Resend(obrigatoria('RESEND_API_KEY'))
  const { error } = await resend.emails.send({
    from: obrigatoria('EMAIL_FROM'),
    to: para,
    subject: m.assunto,
    text: m.texto,
    html: m.html,
  })
  if (error) throw new Error(`Resend: ${error.message}`)
}

export async function enviarEmailTeste(dados: EmailTeste): Promise<void> {
  await enviarEmail(dados.para, montarEmailTeste(dados, obrigatoria('DOWNLOAD_URL')))
}
