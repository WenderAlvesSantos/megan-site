import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminAutorizado } from '../lib/admin.js'
import { gravarAtualizacao } from '../lib/appAtualizacao.js'

/** Chamado pelo build_n18.bat — Bearer = MEGAN_N18_PUBLISH_TOKEN ou ADMIN_PASSWORD. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ erro: 'Método não permitido.' })
    return
  }
  const token = String(process.env.MEGAN_N18_PUBLISH_TOKEN || process.env.ADMIN_PASSWORD || '').trim()
  if (token.length < 12) {
    res.status(503).json({ erro: 'Token de publicação não configurado.' })
    return
  }
  if (!adminAutorizado(String(req.headers.authorization ?? ''), token)) {
    res.status(401).json({ erro: 'Não autorizado.' })
    return
  }
  const corpo = (req.body ?? {}) as { versao?: string; url?: string; notas?: string }
  try {
    const info = await gravarAtualizacao(String(corpo.versao || ''), String(corpo.url || ''), String(corpo.notas || ''))
    res.status(200).json({ ok: true, ...info })
  } catch (e) {
    res.status(400).json({ erro: e instanceof Error ? e.message : 'Falha ao publicar.' })
  }
}
