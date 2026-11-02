import { avaliarLicenca } from './licenca.js'
import type { UsuarioMegan } from './mongo.js'

/** Licença vista pelo trade-manager: mesma regra do bot (cadastro, ativo e vencimento), sem chave nem máquina. */
export interface AcessoGerenciador {
  ok: boolean
  plano: string
  venceEm: string | null
  mensagem: string
}

export function acessoGerenciador(u: UsuarioMegan | null, agora: Date, contato = ''): AcessoGerenciador {
  const { ok, plano, venceEm, mensagem } = avaliarLicenca(u, agora, contato)
  return { ok, plano, venceEm, mensagem }
}
