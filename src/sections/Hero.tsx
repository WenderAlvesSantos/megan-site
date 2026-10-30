import { DIAS_TESTE } from '../oferta'

export default function Hero() {
  return (
    <section className="hero">
      <div className="container hero-inner">
        <div className="hero-texto">
          <span className="etiqueta">Teste grátis por {DIAS_TESTE} dias úteis · sem cartão</span>
          <h1>
            Seu day trade no mini-índice, <em>no piloto automático.</em>
          </h1>
          <p className="hero-sub">
            A Megan N18 é um robô que lê o mercado, entra e sai das operações sozinha no seu MetaTrader 5, com gestão
            de risco em todas as operações. Você acompanha, ela executa — sem ansiedade e sem cliques atrasados. E
            ainda leva junto o Megan Trade Manager, a plataforma para controlar sua banca e seu risco.
          </p>
          <div className="hero-acoes">
            <a href="#teste" className="btn">
              Quero testar grátis
            </a>
            <a href="#como-funciona" className="btn btn-fantasma">
              Ver como funciona
            </a>
          </div>
          <ul className="selos">
            <li>Opera sozinha</li>
            <li>Stop em todas as operações</li>
            <li>Gerenciamento de risco incluso</li>
            <li>Modo simulado para começar</li>
          </ul>
        </div>
        <div className="hero-visual">
          <div className="moldura">
            <img
              src="/img/megan-mesa.webp"
              alt="Megan N18, a robô trader, na mesa de operações acompanhando o mini-índice"
              width={1024}
              height={682}
              fetchPriority="high"
            />
          </div>
          <div className="chip chip-topo">
            <span className="ponto verde" /> Megan N18 operando
          </div>
          <div className="chip chip-base">Gestão de risco ativa</div>
        </div>
      </div>
    </section>
  )
}
