import { blocoChave, enviarEmail, escapar } from './email.js'

export type MotivoChave = 'troca' | 'migracao'

export interface EmailChave {
  para: string
  nome: string
  chave: string
  motivo: MotivoChave
}

const INTRO: Record<MotivoChave, string> = {
  troca: 'Geramos uma nova chave de ativação da Megan N18. A chave anterior deixou de funcionar.',
  migracao: 'A Megan N18 agora usa uma chave de ativação, presa a um único computador. Esta é a sua.',
}

export function montarEmailChave({ para, nome, chave, motivo }: EmailChave) {
  const primeiro = nome.split(' ')[0] || 'cliente'
  const ativacao = blocoChave(chave)
  const passo = 'Abra a Megan, clique em "Trocar usuário" (se aparecer), informe este e-mail e a chave abaixo.'
  const texto = [
    `Olá, ${primeiro}!`,
    '',
    INTRO[motivo],
    passo,
    `E-mail: ${para}`,
    '',
    ...ativacao.texto,
    '',
    'Equipe Megan',
  ].join('\n')
  const html = `
  <div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:auto;color:#111827">
    <h2 style="color:#0284c7">Sua chave de ativação da Megan N18</h2>
    <p>Olá, ${escapar(primeiro)}!</p>
    <p>${INTRO[motivo]}</p>
    <p>${passo}<br>E-mail: <b>${escapar(para)}</b></p>
    ${ativacao.html}
  </div>`
  return { assunto: 'Sua chave de ativação da Megan N18', texto, html }
}

export async function enviarEmailChave(dados: EmailChave): Promise<void> {
  await enviarEmail(dados.para, montarEmailChave(dados))
}
