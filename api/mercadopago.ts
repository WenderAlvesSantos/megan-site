import type { VercelRequest, VercelResponse } from '@vercel/node'
import { depsLiberacaoReais } from '../lib/compraDeps.js'
import { liberarCompra } from '../lib/liberacao.js'
import { assinaturaWebhookValida, buscarPagamento, ErroMercadoPago } from '../lib/mercadopago.js'

function texto(v: unknown): string {
  return String(Array.isArray(v) ? v[0] : (v ?? '')).trim()
}

// Notificação do Mercado Pago. Os dados do aviso não são confiáveis: o pagamento é sempre
// relido na API com o token da conta antes de liberar qualquer licença.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).end()
    return
  }
  const corpo = (req.body ?? {}) as { type?: string; data?: { id?: unknown } }
  const tipo = texto(req.query.type ?? req.query.topic ?? corpo.type)
  const id = texto(req.query['data.id'] ?? req.query.id ?? corpo.data?.id)
  if (tipo !== 'payment' || !id) {
    res.status(200).json({ ok: true, ignorado: true })
    return
  }
  const segredo = String(process.env.MP_WEBHOOK_SECRET ?? '').trim()
  const assinatura = texto(req.headers['x-signature'])
  if (segredo && assinatura && !assinaturaWebhookValida(assinatura, texto(req.headers['x-request-id']), id, segredo)) {
    res.status(401).json({ ok: false })
    return
  }
  try {
    const r = await liberarCompra(await buscarPagamento(id), await depsLiberacaoReais())
    console.log('[mercadopago] pagamento', id, r.status)
    res.status(200).json({ ok: true })
  } catch (e) {
    // Pagamento inexistente (ex.: "Simular notificação" do painel): reenviar não adianta
    if (e instanceof ErroMercadoPago && e.status === 404) {
      res.status(200).json({ ok: true, ignorado: true })
      return
    }
    // 500 faz o Mercado Pago reenviar a notificação
    console.error('[mercadopago] erro', id, e)
    res.status(500).json({ ok: false })
  }
}
