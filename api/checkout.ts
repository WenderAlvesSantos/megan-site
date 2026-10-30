import type { VercelRequest, VercelResponse } from '@vercel/node'
import { iniciarCompra } from '../lib/compra.js'
import { depsCheckoutReais } from '../lib/compraDeps.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ status: 'invalido', mensagem: 'Método não permitido.' })
    return
  }
  try {
    const r = await iniciarCompra(req.body, await depsCheckoutReais())
    res.status(r.status === 'invalido' ? 400 : 200).json(r)
  } catch (e) {
    console.error('[checkout] erro', e)
    res.status(500).json({ status: 'erro', mensagem: 'Não foi possível abrir o pagamento agora. Tente de novo em instantes.' })
  }
}
