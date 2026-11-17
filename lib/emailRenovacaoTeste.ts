import { blocoChave, enviarEmail, escapar, formatarVencimento } from './email.js'

export interface EmailTesteRenovado {
  para: string
  nome: string
  venceEm: Date
  /** chave nova só se o cliente ainda não tinha; null = continua com a mesma */
  chave: string | null
}

export function montarEmailTesteRenovado({ para, nome, venceEm, chave }: EmailTesteRenovado) {
  const primeiro = nome.split(' ')[0] || 'cliente'
  const vence = formatarVencimento(venceEm)
  const ativacao = blocoChave(chave)
  const texto = [
    `Olá, ${primeiro}!`,
    '',
    `Seu teste gratuito da Megan N18 foi renovado até ${vence} (horário de Brasília).`,
    'Continua valendo 1 contrato.',
    '',
    `Se você já usa a Megan, não precisa instalar de novo: basta abrir o programa com este e-mail (${para}), a licença é atualizada sozinha.`,
    '',
    ...ativacao.texto,
    '',
    'Bons trades!',
    'Equipe Megan',
  ].join('\n')
  const html = `
  <div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:auto;color:#111827">
    <h2 style="color:#0284c7">Seu teste da Megan foi renovado</h2>
    <p>Olá, ${escapar(primeiro)}!</p>
    <p>Você pode usar a Megan N18 até <b>${escapar(vence)}</b> (horário de Brasília), com 1 contrato.</p>
    <p>Se você já usa a Megan, não precisa instalar de novo: basta abrir o programa com este e-mail (<b>${escapar(para)}</b>), a licença é atualizada sozinha.</p>
    ${ativacao.html}
    <p style="color:#6b7280;font-size:12px">Operações em renda variável envolvem risco. Resultados passados não garantem resultados futuros.</p>
  </div>`
  return { assunto: 'Seu teste da Megan N18 foi renovado', texto, html }
}

export async function enviarEmailTesteRenovado(dados: EmailTesteRenovado): Promise<void> {
  await enviarEmail(dados.para, montarEmailTesteRenovado(dados))
}
