import { createPrivateKey, sign, type KeyObject } from 'node:crypto'
import { obrigatoria } from './config.js'

export interface RespostaAssinada {
  payload: string
  sig: string
}

let chave: KeyObject | undefined

function chavePrivada(): KeyObject {
  if (!chave) {
    const der = Buffer.from(obrigatoria('LICENSE_SIGNING_KEY'), 'base64')
    chave = createPrivateKey({ key: der, format: 'der', type: 'pkcs8' })
  }
  return chave
}

/** Assina o JSON exato enviado: a Megan verifica os bytes de ``payload`` antes de interpretá-lo. */
export function assinar(dados: object, chaveOpcional?: KeyObject): RespostaAssinada {
  const payload = JSON.stringify(dados)
  const sig = sign(null, Buffer.from(payload, 'utf8'), chaveOpcional ?? chavePrivada()).toString('base64')
  return { payload, sig }
}
