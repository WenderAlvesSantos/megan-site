import { formatarVencimento } from './email.js'
import type { UsuarioMegan } from './mongo.js'

export interface ResultadoLicenca {
  ok: boolean
  nome: string
  contratos: number
  plano: string
  venceEm: string | null
  mensagem: string
}

/** O teste gratuito opera sempre com 1 contrato, inclusive quem foi cadastrado com outro valor. */
export const CONTRATOS_TESTE = 1

function vencimento(u: UsuarioMegan): Date | null {
  const d = u.plan === 'anual' ? u.licenseEndsAt : u.plan === 'trial' ? u.trialEndsAt : undefined
  return d ? new Date(d) : null
}

export function avaliarLicenca(u: UsuarioMegan | null, agora: Date, contato = ''): ResultadoLicenca {
  const vence = u ? vencimento(u) : null
  const negado = (mensagem: string): ResultadoLicenca => ({
    ok: false,
    nome: u?.name ?? '',
    contratos: 0,
    plano: u?.plan ?? '',
    venceEm: vence ? vence.toISOString() : null,
    mensagem,
  })
  const falar = contato ? ` Fale com a gente: ${contato}.` : ''
  if (!u) return negado('E-mail não autorizado na Megan. Faça seu cadastro para liberar o teste.')
  if (!u.active) return negado(`Conta desativada.${falar || ' Contate o suporte.'}`)
  const plano = u.plan || 'licenca'
  if (vence && agora.getTime() >= vence.getTime()) {
    const quando = formatarVencimento(vence)
    return negado(
      plano === 'anual'
        ? `Sua licença anual da Megan venceu em ${quando}. Renove para continuar.${falar}`
        : `Seu teste gratuito terminou em ${quando}. Para continuar, contrate a Megan.${falar}`,
    )
  }
  return {
    ok: true,
    nome: u.name,
    contratos: plano === 'trial' ? CONTRATOS_TESTE : Math.max(0, Number(u.contract) || 0),
    plano,
    venceEm: vence ? vence.toISOString() : null,
    mensagem: 'OK',
  }
}
