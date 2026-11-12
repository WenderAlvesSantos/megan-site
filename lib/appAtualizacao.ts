/** Versão atual da Megan N18 e link do Setup (Vercel: MEGAN_N18_VERSAO + DOWNLOAD_URL). */
export function infoAtualizacao(): { appVersao?: string; downloadUrl?: string } {
  const appVersao = String(process.env.MEGAN_N18_VERSAO ?? '').trim()
  const downloadUrl = String(process.env.DOWNLOAD_URL ?? '').trim()
  if (!appVersao) return {}
  return downloadUrl ? { appVersao, downloadUrl } : { appVersao }
}
