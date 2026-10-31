import { hashChave, normalizarChave, type NovaChave } from './chave.js'
import type { UsuarioMegan } from './mongo.js'

export type MotivoRecusa = 'sem_chave' | 'chave_invalida' | 'outra_maquina' | 'chave_nao_gerada'

export type ResultadoAtivacao = { ok: true; vincular: boolean } | { ok: false; motivo: MotivoRecusa; mensagem: string }

const SUPORTE = 'Fale com o suporte para receber uma nova chave.'

/** Uma chave por cliente, presa ao primeiro computador onde for ativada. */
export function verificarAtivacao(u: UsuarioMegan, chave: unknown, maquina: string): ResultadoAtivacao {
  if (!u.licenseKeyHash) {
    return { ok: false, motivo: 'chave_nao_gerada', mensagem: `Sua chave de ativação ainda não foi gerada. ${SUPORTE}` }
  }
  if (!normalizarChave(chave)) {
    return { ok: false, motivo: 'sem_chave', mensagem: 'Informe a chave de ativação enviada para o seu e-mail.' }
  }
  if (hashChave(chave) !== u.licenseKeyHash) {
    return {
      ok: false,
      motivo: 'chave_invalida',
      mensagem: 'Chave de ativação inválida para este e-mail. Confira o último e-mail da Megan ou fale com o suporte.',
    }
  }
  if (u.machineId && u.machineId !== maquina) {
    return {
      ok: false,
      motivo: 'outra_maquina',
      mensagem: `Esta chave já está ativada em outro computador. Para usar a Megan neste computador, ${SUPORTE.toLowerCase()}`,
    }
  }
  return { ok: true, vincular: !u.machineId }
}

/** Campos gravados ao gerar uma chave nova (a anterior deixa de valer e a máquina é liberada). */
export function camposNovaChave(nova: NovaChave, agora: Date) {
  return { licenseKeyHash: nova.hash, licenseKeyHint: nova.final, licenseKeyCreatedAt: agora }
}
