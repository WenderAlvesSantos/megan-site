import type { VercelRequest, VercelResponse } from '@vercel/node'
import { depsLiberacaoReais } from '../lib/compraDeps.js'
import { situacaoCompra } from '../lib/liberacao.js'

const ID_RE = /^[0-9a-f-]{36}$/

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).end()
    return
  }
  const id = String(req.query.id ?? '').toLowerCase()
  if (!ID_RE.test(id)) {
    res.status(400).json({ status: 'nao_encontrada' })
    return
  }
  try {
    res.setHeader('Cache-Control', 'no-store')
    res.status(200).json(await situacaoCompra(id, await depsLiberacaoReais()))
  } catch (e) {
    console.error('[compra] erro', id, e)
    res.status(503).json({ status: 'pendente' })
  }
}
