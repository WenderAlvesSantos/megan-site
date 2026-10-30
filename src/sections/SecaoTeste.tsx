import { useState } from 'react'
import type { RespostaCadastro } from '../api'
import Cadastro from '../Cadastro'
import Confirmacao from '../Confirmacao'
import { DIAS_TESTE } from '../oferta'

export default function SecaoTeste() {
  const [resultado, setResultado] = useState<RespostaCadastro | null>(null)
  return (
    <section id="teste" className="secao secao-teste">
      <div className="container teste-inner">
        <div className="teste-texto">
          <p className="kicker">Teste grátis</p>
          <h2>{DIAS_TESTE} dias úteis para ver a Megan N18 trabalhando</h2>
          <ul className="lista-check">
            <li>Acesso completo durante o teste</li>
            <li>Megan Trade Manager para gerenciar sua banca</li>
            <li>Liberação automática, na hora</li>
            <li>Sem cartão de crédito</li>
            <li>Suporte pelo WhatsApp</li>
          </ul>
        </div>
        <div className="cartao-form">
          {resultado ? (
            <Confirmacao resultado={resultado} onVoltar={() => setResultado(null)} />
          ) : (
            <Cadastro onConcluido={setResultado} />
          )}
        </div>
      </div>
    </section>
  )
}
