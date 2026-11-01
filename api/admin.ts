import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  adminAutorizado,
  aplicarConfigGerenciador,
  configurarGerenciadorCliente,
  emitirNovaChave,
  gerarChavesFaltantes,
  type DepsAdmin,
} from '../lib/admin.js'
import { dadosPainel, depsConfigGerenciador, detalheCliente, listarClientes } from '../lib/adminDados.js'
import { depsReembolsoReais } from '../lib/compraDeps.js'
import { reembolsarCompra } from '../lib/reembolso.js'
import { enviarEmailChave } from '../lib/emailChave.js'
import { colecaoUsuarios, registrarEvento } from '../lib/mongo.js'
import { normalizarEmail } from '../lib/validacao.js'

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

async function responderGet(req: VercelRequest, res: VercelResponse) {
  const q = req.query as Record<string, unknown>
  if (q.visao === 'painel') {
    res.status(200).json(await dadosPainel(q))
    return
  }
  if (q.email) {
    const cliente = await detalheCliente(normalizarEmail(q.email))
    res.status(cliente ? 200 : 404).json(cliente ? { cliente } : { erro: 'Cliente não encontrado.' })
    return
  }
  res.status(200).json(await listarClientes(q))
}

async function responderPost(req: VercelRequest, res: VercelResponse) {
  const corpo = (req.body ?? {}) as { acao?: string; email?: string }
  const email = normalizarEmail(corpo.email)
  switch (corpo.acao) {
    case 'nova-chave': {
      const r = await emitirNovaChave(email, 'troca', await deps())
      res.status(r.ok ? 200 : 404).json(r)
      return
    }
    case 'gerar-faltantes':
      res.status(200).json(await gerarChavesFaltantes(await deps()))
      return
    case 'config-gerenciador':
      res.status(200).json(await aplicarConfigGerenciador(await depsConfigGerenciador()))
      return
    case 'reembolsar': {
      const r = await reembolsarCompra(email, await depsReembolsoReais())
      res.status(r.ok ? 200 : 409).json(r)
      return
    }
    case 'config-gerenciador-cliente':
      if (!(await detalheCliente(email))) {
        res.status(404).json({ erro: 'Cliente não encontrado.' })
        return
      }
      res.status(200).json(await configurarGerenciadorCliente(email, await depsConfigGerenciador()))
      return
    default:
      res.status(400).json({ erro: 'Ação desconhecida.' })
  }
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
    if (req.method === 'GET') await responderGet(req, res)
    else if (req.method === 'POST') await responderPost(req, res)
    else res.status(405).end()
  } catch (e) {
    console.error('[admin] erro', e)
    res.status(500).json({ erro: 'Falha no servidor. Tente de novo.' })
  }
}
