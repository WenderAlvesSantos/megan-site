const ITENS = [
  'Computador com Windows 10 ou 11 (64 bits)',
  'MetaTrader 5 instalado e logado na sua corretora',
  'Conta em corretora que negocie o mini-índice (WIN) pelo MetaTrader 5',
  'Internet estável durante o pregão',
]

export default function Requisitos() {
  return (
    <section className="secao secao-alt">
      <div className="container requisitos">
        <div className="retrato">
          <img
            src="/img/megan-retrato.webp"
            alt="Megan N18, a robô trader, na sala de operações"
            width={639}
            height={1024}
            loading="lazy"
          />
        </div>
        <div>
          <p className="kicker">O que você precisa</p>
          <h2>Requisitos simples</h2>
          <p className="texto-apoio">
            A Megan N18 roda no seu próprio computador, conectada ao seu MetaTrader 5. Seu dinheiro continua na sua
            corretora — a Megan só envia as ordens.
          </p>
          <ul className="lista-check">
            {ITENS.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
