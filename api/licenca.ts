import type { VercelRequest, VercelResponse } from '@vercel/node'
import { assinar } from '../lib/assinatura.js'
import { config } from '../lib/config.js'
import { colecaoUsuarios, registrarEvento } from '../lib/mongo.js'
import { responderLicenca } from '../lib/pedidoLicenca.js'
import { emailValido, normalizarEmail } from '../lib/validacao.js'

const NONCE_RE = /^[a-f0-9]{16,64}$/
const MAQUINA_RE = /^[a-f0-9]{32,64}$/

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ erro: 'Método não permitido.' })
    return
  }
  const corpo = (req.body ?? {}) as Record<string, unknown>
  const email = normalizarEmail(corpo.email)
  const nonce = String(corpo.nonce ?? '')
  const maquina = String(corpo.maquina ?? '').toLowerCase()
  if (!emailValido(email) || !NONCE_RE.test(nonce) || !MAQUINA_RE.test(maquina)) {
    res.status(400).json({ erro: 'Requisição inválida. Atualize a Megan para a versão mais recente.' })
    return
  }
  try {
    const usuarios = await colecaoUsuarios()
    const resultado = await responderLicenca(email, corpo.chave, maquina, {
      agora: () => new Date(),
      contato: config.contato(),
      buscar: (e) => usuarios.findOne({ email: e }),
      vincular: async (e, hash, m, agora) => {
        const r = await usuarios.updateOne(
          { email: e, licenseKeyHash: hash, machineId: { $exists: false } },
          { $set: { machineId: m, machineBoundAt: agora } },
        )
        return r.modifiedCount === 1
      },
      marcarConsulta: async (e, agora) => {
        await usuarios.updateOne({ email: e }, { $set: { lastCheckAt: agora } })
      },
      evento: registrarEvento,
    })
    const emitidoEm = new Date().toISOString()
    res.status(200).json(assinar({ ...resultado, email, nonce, maquina, app: String(corpo.app ?? ''), emitidoEm }))
  } catch (e) {
    console.error('[licenca] erro', e)
    res.status(503).json({ erro: 'Servidor de licença indisponível. Tente de novo em instantes.' })
  }
}
