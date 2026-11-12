import type { VercelRequest, VercelResponse } from '@vercel/node'
import { lerAtualizacao } from '../lib/appAtualizacao.js'

/** Público: a Megan compara com a versão instalada. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.status(405).json({ erro: 'Método não permitido.' })
    return
  }
  const info = await lerAtualizacao()
  res.setHeader('Cache-Control', 'no-store')
  res.status(200).json({ versao: info.appVersao || '', url: info.downloadUrl || '', notas: info.notas || '' })
}
