import type { ReactNode } from 'react'
import type { DadosCadastro } from './api'

interface Props {
  dados: DadosCadastro
  alterar: (campo: keyof DadosCadastro, valor: string | boolean) => void
  textoAceite: ReactNode
}

export default function CamposContato({ dados, alterar, textoAceite }: Props) {
  return (
    <>
      <label>
        Nome completo
        <input value={dados.nome} onChange={(e) => alterar('nome', e.target.value)} autoComplete="name" required />
      </label>
      <label>
        E-mail
        <input
          type="email"
          value={dados.email}
          onChange={(e) => alterar('email', e.target.value)}
          autoComplete="email"
          required
        />
        <small>Você vai usar este e-mail para entrar na Megan N18.</small>
      </label>
      <label>
        WhatsApp (com DDD)
        <input
          type="tel"
          value={dados.telefone}
          onChange={(e) => alterar('telefone', e.target.value)}
          autoComplete="tel"
          placeholder="(11) 91234-5678"
          required
        />
      </label>
      <input
        className="isca"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={dados.website}
        onChange={(e) => alterar('website', e.target.value)}
        name="website"
      />
      <label className="aceite">
        <input type="checkbox" checked={dados.aceite} onChange={(e) => alterar('aceite', e.target.checked)} />
        {textoAceite}
      </label>
    </>
  )
}
