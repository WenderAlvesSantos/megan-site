// Gera o par de chaves Ed25519 da licença. Rode uma única vez e guarde a privada só no Vercel.
import { generateKeyPairSync } from 'node:crypto'

const { privateKey, publicKey } = generateKeyPairSync('ed25519')
const privada = privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64')
const publica = publicKey.export({ format: 'der', type: 'spki' }).subarray(-32).toString('base64')

console.log('Vercel > Settings > Environment Variables:')
console.log(`LICENSE_SIGNING_KEY=${privada}`)
console.log('')
console.log('megan-v2/megan_profit/.env (máquina de build do MeganN18):')
console.log(`MEGAN_LICENSE_PUBKEY=${publica}`)
