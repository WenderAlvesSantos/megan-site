import type { VercelRequest, VercelResponse } from '@vercel/node'
import { processarCadastro } from '../lib/cadastro.js'
import { config } from '../lib/config.js'
import { enviarEmailTeste } from '../lib/email.js'
import { criarContaGerenciador } from '../lib/gerenciador.js'
import { colecaoUsuarios } from '../lib/mongo.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ status: 'invalido', mensagem: 'Método não permitido.' })
    return
  }
  try {
    const usuarios = await colecaoUsuarios()
    const r = await processarCadastro(req.body, {
      buscar: (email) => usuarios.findOne({ email }),
      inserir: async (doc) => {
        try {
          await usuarios.insertOne(doc)
          return true
        } catch (e) {
          if ((e as { code?: number }).code === 11000) return false
          throw e
        }
      },
      criarContaGerenciador,
      enviarEmail: enviarEmailTeste,
      agora: () => new Date(),
      diasTeste: config.diasTeste(),
      contratosTeste: config.contratosTeste(),
    })
    res.status(r.status === 'invalido' ? 400 : 200).json(r)
  } catch (e) {
    console.error('[teste] erro', e)
    res.status(500).json({ status: 'erro', mensagem: 'Não foi possível concluir o cadastro agora. Tente de novo em instantes.' })
  }
}
