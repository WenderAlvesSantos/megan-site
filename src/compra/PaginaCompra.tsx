import { useEffect } from 'react'
import { DIAS_ARREPENDIMENTO, PARCELAS_ANUAL, POLITICA_CANCELAMENTO, PRECO_ANUAL, precoFormatado } from '../oferta'
import FormCompra from './FormCompra'
import StatusCompra from './StatusCompra'

const INCLUSO = [
  '12 meses de acesso completo à Megan N18',
  'Sem limite de contratos',
  'Megan Trade Manager para gerenciar sua banca',
  'Liberação automática assim que o pagamento é aprovado',
  'Renovou antes de vencer? O novo ano é somado ao que falta',
  `${DIAS_ARREPENDIMENTO} dias para desistir com reembolso total`,
  'Suporte no grupo do Telegram',
]

export default function PaginaCompra() {
  const compraId = new URLSearchParams(window.location.search).get('compra')

  useEffect(() => {
    document.title = 'Megan N18 — Licença anual'
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])

  return (
    <>
      <header className="nav">
        <div className="container nav-inner">
          <a href="/" className="logo">
            Megan <span>N18</span>
          </a>
        </div>
      </header>
      <main className="secao secao-teste">
        <div className="container teste-inner">
          <div className="teste-texto">
            <p className="kicker">Licença anual</p>
            <h2>Megan N18 trabalhando para você o ano inteiro</h2>
            <p className="preco">
              {precoFormatado(PRECO_ANUAL)} <small>por 12 meses</small>
            </p>
            <div className="selo-mp">
              <img src="/img/mercadopago.svg" alt="Mercado Pago" width={40} height={40} />
              <div>
                <strong>Pagamento seguro pelo Mercado Pago</strong>
                <span>Pix, saldo do Mercado Pago ou cartão de crédito em até {PARCELAS_ANUAL}x.</span>
              </div>
            </div>
            <ul className="lista-check">
              {INCLUSO.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
            <p className="texto-apoio">
              <b>Cancelamento:</b> {POLITICA_CANCELAMENTO} Para desistir, responda o e-mail de confirmação da compra ou
              fale com o suporte no grupo do Telegram (o link vai no e-mail).
            </p>
          </div>
          <div className="cartao-form">{compraId ? <StatusCompra id={compraId} /> : <FormCompra />}</div>
        </div>
      </main>
      <footer className="rodape">
        <div className="container">
          <p>
            Aviso de risco: operações em renda variável, inclusive no mercado futuro, envolvem risco de perda.
            Resultados passados não garantem resultados futuros. A Megan N18 é uma ferramenta de automação e não
            constitui recomendação de investimento.
          </p>
        </div>
      </footer>
    </>
  )
}
