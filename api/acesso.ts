import type { VercelRequest, VercelResponse } from '@vercel/node'
import { acessoGerenciador } from '../lib/acessoGerenciador.js'
import { adminAutorizado } from '../lib/admin.js'
import { config } from '../lib/config.js'
import { colecaoUsuarios } from '../lib/mongo.js'
import { emailValido, normalizarEmail } from '../lib/validacao.js'

// POST /api/acesso — o trade-manager confere se o e-mail tem licença da Megan vigente.
// Autenticado com "Authorization: Bearer <TRADE_MANAGER_API_KEY>" (a mesma chave da integração).
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ erro: 'Método não permitido.' })
    return
  }
  const segredo = String(process.env.TRADE_MANAGER_API_KEY ?? '').trim()
  if (!segredo) {
    res.status(503).json({ erro: 'Integração não configurada.' })
    return
  }
  if (!adminAutorizado(String(req.headers.authorization ?? ''), segredo)) {
    res.status(401).json({ erro: 'Não autorizado.' })
    return
  }
  const email = normalizarEmail(((req.body ?? {}) as Record<string, unknown>).email)
  if (!emailValido(email)) {
    res.status(400).json({ erro: 'E-mail inválido.' })
    return
  }
  try {
    const usuario = await (await colecaoUsuarios()).findOne({ email })
    res.status(200).json(acessoGerenciador(usuario, new Date(), config.contato()))
  } catch (e) {
    console.error('[acesso] erro', e)
    res.status(503).json({ erro: 'Servidor de licença indisponível.' })
  }
}
