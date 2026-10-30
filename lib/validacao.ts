const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export interface CadastroValido {
  nome: string
  email: string
  telefone: string
}

export type ResultadoValidacao = { ok: true; dados: CadastroValido } | { ok: false; mensagem: string }

export function normalizarEmail(email: unknown): string {
  return String(email ?? '').trim().toLowerCase()
}

export function emailValido(email: string): boolean {
  return EMAIL_RE.test(email) && email.length <= 120
}

export function validarCadastro(
  corpo: unknown,
  mensagemAceite = 'Para liberar o teste, aceite os termos de uso.',
): ResultadoValidacao {
  const c = (corpo ?? {}) as Record<string, unknown>
  if (String(c.website ?? '').trim()) return { ok: false, mensagem: 'Cadastro recusado.' }
  const nome = String(c.nome ?? '').trim().replace(/\s+/g, ' ')
  const email = normalizarEmail(c.email)
  const telefone = String(c.telefone ?? '').replace(/\D/g, '')
  if (nome.length < 3 || nome.length > 80) return { ok: false, mensagem: 'Informe seu nome completo.' }
  if (!emailValido(email)) return { ok: false, mensagem: 'Informe um e-mail válido.' }
  if (telefone.length < 10 || telefone.length > 13) return { ok: false, mensagem: 'Informe um WhatsApp válido com DDD.' }
  if (c.aceite !== true) return { ok: false, mensagem: mensagemAceite }
  return { ok: true, dados: { nome, email, telefone } }
}
