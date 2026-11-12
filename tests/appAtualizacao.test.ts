import { describe, expect, it } from 'vitest'
import { montarInfo } from '../lib/appAtualizacao.js'

describe('montarInfo', () => {
  it('vazio sem documento e sem DOWNLOAD_URL', () => {
    expect(montarInfo(null, '')).toEqual({})
  })

  it('usa a versão do Mongo e o link do Drive', () => {
    expect(montarInfo({ versao: '1.0.12', url: 'https://drive.google.com/file/d/abc' })).toEqual({
      appVersao: '1.0.12',
      downloadUrl: 'https://drive.google.com/file/d/abc',
    })
  })

  it('versão sozinha se ainda não houver URL', () => {
    expect(montarInfo({ versao: '1.0.11', url: '' })).toEqual({ appVersao: '1.0.11' })
  })

  it('completa URL faltando com DOWNLOAD_URL do ambiente', () => {
    expect(montarInfo({ versao: '1.0.12', url: '' }, 'https://drive.google.com/x')).toEqual({
      appVersao: '1.0.12',
      downloadUrl: 'https://drive.google.com/x',
    })
  })

  it('inclui notas quando existirem', () => {
    expect(montarInfo({ versao: '1.0.12', url: 'https://x', notas: 'correções' })).toEqual({
      appVersao: '1.0.12',
      downloadUrl: 'https://x',
      notas: 'correções',
    })
  })
})
