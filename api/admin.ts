import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminAutorizado, emitirNovaChave, gerarChavesFaltantes, resumoCliente, type DepsAdmin } from '../lib/admin.js'
import { enviarEmailChave } from '../lib/emailChave.js'
import { colecaoEventos, colecaoUsuarios, registrarEvento } from '../lib/mongo.js'
import { normalizarEmail } from '../lib/validacao.js'

const escaparRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function deps(): Promise<DepsAdmin> {
  const usuarios = await colecaoUsuarios()
  return {
    agora: () => new Date(),
    buscarUsuario: (email) => usuarios.findOne({ email }),
    trocarChave: async (email, campos) => {
      await usuarios.updateOne({ email }, { $set: { ...campos, updatedAt: new Date() }, $unset: { machineId: '', machineBoundAt: '' } })
    },
    semChave: () => usuarios.find({ licenseKeyHash: { $exists: false }, active: true }).limit(500).toArray(),
    enviarEmailChave,
    evento: registrarEvento,
  }
}

async function buscar(termo: string) {
  const [usuarios, eventos] = await Promise.all([colecaoUsuarios(), colecaoEventos()])
  const re = new RegExp(escaparRegex(termo.trim()), 'i')
  const filtro = termo.trim() ? { $or: [{ email: re }, { name: re }] } : {}
  const lista = await usuarios.find(filtro).sort({ createdAt: -1 }).limit(20).toArray()
  const evs = await eventos
    .find({ email: { $in: lista.map((u) => u.email) } })
    .sort({ em: -1 })
    .limit(200)
    .toArray()
  const agora = new Date()
  return lista.map((u) => resumoCliente(u, evs, agora))
}

// Página /admin do suporte. Senha em ADMIN_PASSWORD (mínimo 12 caracteres).
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')
  const senha = String(process.env.ADMIN_PASSWORD ?? '').trim()
  if (senha.length < 12) {
    res.status(503).json({ erro: 'ADMIN_PASSWORD não configurada (mínimo 12 caracteres).' })
    return
  }
  if (!adminAutorizado(String(req.headers.authorization ?? ''), senha)) {
    await esperar(800)
    res.status(401).json({ erro: 'Senha incorreta.' })
    return
  }
  try {
    if (req.method === 'GET') {
      res.status(200).json({ clientes: await buscar(String(req.query.q ?? '')) })
      return
    }
    if (req.method !== 'POST') {
      res.status(405).end()
      return
    }
    const corpo = (req.body ?? {}) as { acao?: string; email?: string }
    if (corpo.acao === 'nova-chave') {
      const r = await emitirNovaChave(normalizarEmail(corpo.email), 'troca', await deps())
      res.status(r.ok ? 200 : 404).json(r)
      return
    }
    if (corpo.acao === 'gerar-faltantes') {
      res.status(200).json(await gerarChavesFaltantes(await deps()))
      return
    }
    res.status(400).json({ erro: 'Ação desconhecida.' })
  } catch (e) {
    console.error('[admin] erro', e)
    res.status(500).json({ erro: 'Falha no servidor. Tente de novo.' })
  }
}
