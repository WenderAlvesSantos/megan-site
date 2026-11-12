import { colecaoConfig, type ConfigN18 } from './mongo.js'

export type InfoN18 = { appVersao?: string; downloadUrl?: string; notas?: string }

export function montarInfo(
  doc: Pick<ConfigN18, 'versao' | 'url' | 'notas'> | null | undefined,
  downloadEnv = '',
): InfoN18 {
  const appVersao = String(doc?.versao ?? '').trim()
  const downloadUrl = String(doc?.url ?? '').trim() || String(downloadEnv ?? '').trim()
  const notas = String(doc?.notas ?? '').trim()
  if (!appVersao && !downloadUrl) return {}
  const out: InfoN18 = {}
  if (appVersao) out.appVersao = appVersao
  if (downloadUrl) out.downloadUrl = downloadUrl
  if (notas) out.notas = notas
  return out
}

export async function lerAtualizacao(): Promise<InfoN18> {
  try {
    const doc = await (await colecaoConfig()).findOne({ _id: 'n18' })
    return montarInfo(doc, process.env.DOWNLOAD_URL)
  } catch {
    return montarInfo(null, process.env.DOWNLOAD_URL)
  }
}

export async function gravarAtualizacao(versao: string, url: string, notas = ''): Promise<InfoN18> {
  const col = await colecaoConfig()
  const atual = await col.findOne({ _id: 'n18' })
  const versaoOk = String(versao || '').trim()
  const urlOk = String(url || '').trim() || String(atual?.url || process.env.DOWNLOAD_URL || '').trim()
  const notasOk = String(notas || '').trim()
  if (!versaoOk) throw new Error('Informe a versão (ex.: 1.0.12).')
  await col.updateOne(
    { _id: 'n18' },
    { $set: { versao: versaoOk, url: urlOk, notas: notasOk, publicadoEm: new Date() } },
    { upsert: true },
  )
  return montarInfo({ versao: versaoOk, url: urlOk, notas: notasOk }, '')
}
