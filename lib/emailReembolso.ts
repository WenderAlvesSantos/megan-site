import { enviarEmail, escapar, formatarVencimento } from './email.js'

export function montarEmailReembolso(nome: string, licencaAte: Date, agora = new Date()) {
  const primeiro = nome.split(' ')[0] || 'cliente'
  const restante = licencaAte.getTime() > agora.getTime() + 60_000
  const situacao = restante
    ? `A licença do ano anterior continua valendo até ${formatarVencimento(licencaAte)}.`
    : 'A licença anual desta compra foi encerrada.'
  const texto = [
    `Olá, ${primeiro}!`,
    '',
    'Seu pedido de desistência foi atendido e o pagamento da licença anual da Megan N18 foi estornado pelo Mercado Pago.',
    'No Pix, o valor volta para a conta de origem; no cartão, a compra e as parcelas são canceladas na fatura (o prazo depende do banco).',
    situacao,
    '',
    'Se mudar de ideia, é só comprar de novo pelo site.',
    'Equipe Megan',
  ].join('\n')
  const html = `
  <div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:auto;color:#111827">
    <h2 style="color:#0284c7">Reembolso confirmado</h2>
    <p>Olá, ${escapar(primeiro)}!</p>
    <p>Seu pedido de desistência foi atendido e o pagamento da licença anual da Megan N18 foi <b>estornado pelo Mercado Pago</b>.</p>
    <p>No Pix, o valor volta para a conta de origem; no cartão, a compra e as parcelas são canceladas na fatura (o prazo depende do banco).</p>
    <p>${escapar(situacao)}</p>
    <p>Se mudar de ideia, é só comprar de novo pelo site.</p>
  </div>`
  return { assunto: 'Reembolso da Megan N18 confirmado', texto, html }
}

export async function enviarEmailReembolso(para: string, nome: string, licencaAte: Date): Promise<void> {
  await enviarEmail(para, montarEmailReembolso(nome, licencaAte))
}
