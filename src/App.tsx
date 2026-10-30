import ComoFunciona from './sections/ComoFunciona'
import Beneficios from './sections/Beneficios'
import Faq from './sections/Faq'
import Gerenciamento from './sections/Gerenciamento'
import Hero from './sections/Hero'
import Requisitos from './sections/Requisitos'
import SecaoTeste from './sections/SecaoTeste'

export default function App() {
  return (
    <>
      <header className="nav">
        <div className="container nav-inner">
          <a href="#topo" className="logo">
            Megan <span>N18</span>
          </a>
          <nav className="nav-links">
            <a href="#beneficios">Benefícios</a>
            <a href="#gerenciamento">Gerenciamento</a>
            <a href="#como-funciona">Como funciona</a>
            <a href="#faq">Dúvidas</a>
            <a href="#teste" className="btn btn-pequeno">
              Teste grátis
            </a>
          </nav>
        </div>
      </header>
      <main id="topo">
        <Hero />
        <Beneficios />
        <Gerenciamento />
        <ComoFunciona />
        <Requisitos />
        <SecaoTeste />
        <Faq />
      </main>
      <footer className="rodape">
        <div className="container">
          <p className="logo">
            Megan <span>N18</span>
          </p>
          <p>
            Aviso de risco: operações em renda variável, inclusive no mercado futuro, envolvem risco de perda.
            Resultados passados não garantem resultados futuros. A Megan N18 é uma ferramenta de automação e não
            constitui recomendação de investimento.
          </p>
          <p className="copy">© {new Date().getFullYear()} Megan N18. Todos os direitos reservados.</p>
        </div>
      </footer>
    </>
  )
}
