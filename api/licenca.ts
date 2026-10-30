import type { VercelRequest, VercelResponse } from '@vercel/node'
import { assinar } from '../lib/assinatura.js'
import { config } from '../lib/config.js'
import { avaliarLicenca } from '../lib/licenca.js'
import { colecaoUsuarios } from '../lib/mongo.js'
import { emailValido, normalizarEmail } from '../lib/validacao.js'

const NONCE_RE = /^[a-f0-9]{16,64}$/

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ erro: 'Método não permitido.' })
    return
  }
  const corpo = (req.body ?? {}) as Record<string, unknown>
  const email = normalizarEmail(corpo.email)
  const nonce = String(corpo.nonce ?? '')
  if (!emailValido(email) || !NONCE_RE.test(nonce)) {
    res.status(400).json({ erro: 'Requisição inválida.' })
    return
  }
  try {
    const usuarios = await colecaoUsuarios()
    const usuario = await usuarios.findOne({ email })
    const agora = new Date()
    const resultado = avaliarLicenca(usuario, agora, config.contato())
    res.status(200).json(
      assinar({
        ...resultado,
        email,
        nonce,
        app: String(corpo.app ?? ''),
        emitidoEm: agora.toISOString(),
      }),
    )
  } catch (e) {
    console.error('[licenca] erro', e)
    res.status(503).json({ erro: 'Servidor de licença indisponível. Tente de novo em instantes.' })
  }
}
