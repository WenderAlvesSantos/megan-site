import type { VercelRequest, VercelResponse } from '@vercel/node'
import { timingSafeEqual } from 'node:crypto'
import { depsReconciliacaoReais } from '../lib/compraDeps.js'
import { reconciliarPendentes } from '../lib/reconciliacao.js'

function autorizado(cabecalho: string, segredo: string): boolean {
  const esperado = Buffer.from(`Bearer ${segredo}`)
  const recebido = Buffer.from(cabecalho)
  return esperado.length === recebido.length && timingSafeEqual(esperado, recebido)
}

// Chamado pelo Cron do Vercel, que envia "Authorization: Bearer <CRON_SECRET>".
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const segredo = String(process.env.CRON_SECRET ?? '').trim()
  if (!segredo) {
    res.status(503).json({ erro: 'CRON_SECRET não configurado.' })
    return
  }
  if (!autorizado(String(req.headers.authorization ?? ''), segredo)) {
    res.status(401).json({ erro: 'Não autorizado.' })
    return
  }
  try {
    const r = await reconciliarPendentes(await depsReconciliacaoReais())
    console.log('[reconciliar]', JSON.stringify(r))
    res.status(200).json(r)
  } catch (e) {
    console.error('[reconciliar] erro', e)
    res.status(500).json({ erro: 'Falha ao revisar compras.' })
  }
}
