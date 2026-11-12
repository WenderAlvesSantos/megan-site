import type { VercelRequest, VercelResponse } from '@vercel/node'
import { infoAtualizacao } from '../lib/appAtualizacao.js'

/** Público: a Megan compara com a versão instalada. Sem segredo — só número + link https. */
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.status(405).json({ erro: 'Método não permitido.' })
    return
  }
  const { appVersao, downloadUrl } = infoAtualizacao()
  res.setHeader('Cache-Control', 'no-store')
  res.status(200).json({ versao: appVersao || '', url: downloadUrl || '' })
}
