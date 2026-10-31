import { createHash, randomBytes } from 'node:crypto'

// Base32 Crockford: sem I, L, O, U — o cliente digita a chave do e-mail sem confundir letras
const ALFABETO = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

export interface NovaChave {
  chave: string
  hash: string
  final: string
}

/** Aceita com ou sem "MEGN-", traços e espaços; devolve só os 16 caracteres do corpo. */
export function normalizarChave(chave: unknown): string {
  const n = String(chave ?? '').toUpperCase().replace(/[^0-9A-Z]/g, '')
  return n.length === 20 && n.startsWith('MEGN') ? n.slice(4) : n
}

export function hashChave(chave: unknown): string {
  return createHash('sha256').update(normalizarChave(chave)).digest('hex')
}

/** MEGN-XXXX-XXXX-XXXX-XXXX (80 bits aleatórios). No banco fica só o hash e o final. */
export function gerarChave(): NovaChave {
  const bytes = randomBytes(16)
  const corpo = Array.from({ length: 16 }, (_, i) => ALFABETO[bytes[i] % 32]).join('')
  const chave = `MEGN-${corpo.match(/.{4}/g)!.join('-')}`
  return { chave, hash: hashChave(chave), final: corpo.slice(-4) }
}
