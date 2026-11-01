import type { VercelRequest, VercelResponse } from '@vercel/node'
import { lancarTradeGerenciador } from '../lib/gerenciador.js'
import { lancarTrade } from '../lib/lancamentoTrade.js'
import { colecaoUsuarios } from '../lib/mongo.js'
import { emailValido, normalizarEmail } from '../lib/validacao.js'

const MAQUINA_RE = /^[a-f0-9]{32,64}$/

// POST /api/trade — a Megan avisa cada trade fechado no ao vivo; repassa ao trade-manager.
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
    const r = await lancarTrade(email, corpo.chave, maquina, corpo.trade, {
      buscar: (e) => usuarios.findOne({ email: e }),
      enviar: lancarTradeGerenciador,
    })
    if (r.ok) {
      res.status(200).json({ status: r.status })
      return
    }
    res.status(r.status === 'invalido' ? 400 : 401).json({ status: r.status, erro: r.mensagem })
  } catch (e) {
    console.error('[trade] erro', e)
    res.status(503).json({ erro: 'Gerenciador indisponível. A Megan tenta de novo.' })
  }
}
