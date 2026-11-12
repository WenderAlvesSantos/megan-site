import { afterEach, describe, expect, it } from 'vitest'
import { infoAtualizacao } from '../lib/appAtualizacao.js'

describe('infoAtualizacao', () => {
  const env = { ...process.env }
  afterEach(() => {
    process.env = { ...env }
  })

  it('vazio sem MEGAN_N18_VERSAO', () => {
    delete process.env.MEGAN_N18_VERSAO
    process.env.DOWNLOAD_URL = 'https://drive.google.com/x'
    expect(infoAtualizacao()).toEqual({})
  })

  it('devolve versão e link do Setup', () => {
    process.env.MEGAN_N18_VERSAO = '1.0.12'
    process.env.DOWNLOAD_URL = 'https://drive.google.com/file/d/abc'
    expect(infoAtualizacao()).toEqual({
      appVersao: '1.0.12',
      downloadUrl: 'https://drive.google.com/file/d/abc',
    })
  })

  it('versão sozinha se ainda não houver DOWNLOAD_URL', () => {
    process.env.MEGAN_N18_VERSAO = '1.0.11'
    delete process.env.DOWNLOAD_URL
    expect(infoAtualizacao()).toEqual({ appVersao: '1.0.11' })
  })
})
