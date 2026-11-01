import type { VercelRequest, VercelResponse } from '@vercel/node'
import { bancaMegan } from '../lib/bancaMegan.js'
import { bancaGerenciador } from '../lib/gerenciador.js'
import { colecaoUsuarios } from '../lib/mongo.js'
import { emailValido, normalizarEmail } from '../lib/validacao.js'

const MAQUINA_RE = /^[a-f0-9]{32,64}$/

// POST /api/gerenciador — a Megan consulta os contratos sugeridos e sincroniza a banca inicial no trade-manager.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ erro: 'Método não permitido.' })
    return
  }
  const corpo = (req.body ?? {}) as Record<string, unknown>
  const email = normalizarEmail(corpo.email)
  const maquina = String(corpo.maquina ?? '').toLowerCase()
  if (!emailValido(email) || !MAQUINA_RE.test(maquina)) {
    res.status(400).json({ erro: 'Requisição inválida.' })
    return
  }
  try {
    const usuarios = await colecaoUsuarios()
    const r = await bancaMegan(email, corpo.chave, maquina, corpo, {
      buscar: (e) => usuarios.findOne({ email: e }),
      consultar: bancaGerenciador,
    })
    if (r.ok) {
      res.status(200).json(r.status === 'ok' ? { status: 'ok', ...r.banca } : { status: r.status })
      return
    }
    res.status(r.status === 'invalido' ? 400 : 401).json({ status: r.status, erro: r.mensagem })
  } catch (e) {
    console.error('[gerenciador] erro', e)
    res.status(503).json({ erro: 'Gerenciador indisponível. Tente de novo em instantes.' })
  }
}
