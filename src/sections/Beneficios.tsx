const ITENS = [
  {
    icone: '⚡',
    titulo: 'Execução automática',
    texto: 'Lê o fluxo do mercado em tempo real e envia as ordens na hora certa, sem hesitação e sem atraso de clique.',
  },
  {
    icone: '🛡️',
    titulo: 'Risco sob controle',
    texto: 'Toda operação nasce com stop. Limite de perda diário encerra o dia sozinho quando necessário.',
  },
  {
    icone: '🧠',
    titulo: 'Disciplina de verdade',
    texto: 'Sem medo, sem euforia, sem vingança. A Megan segue as regras em todas as operações, todos os dias.',
  },
  {
    icone: '🕒',
    titulo: 'Horário inteligente',
    texto: 'Opera só na janela de maior liquidez do pregão e evita os momentos de mercado travado.',
  },
  {
    icone: '🎯',
    titulo: 'Você no comando',
    texto: 'Escolha a quantidade de contratos, ligue e desligue quando quiser e acompanhe cada operação no painel.',
  },
  {
    icone: '🧪',
    titulo: 'Comece sem risco',
    texto: 'Use o modo simulado e o replay para conhecer a Megan antes de colocar dinheiro real.',
  },
]

export default function Beneficios() {
  return (
    <section id="beneficios" className="secao">
      <div className="container">
        <p className="kicker">Por que a Megan N18</p>
        <h2>Tecnologia de mesa profissional, simples de usar</h2>
        <div className="grade">
          {ITENS.map((i) => (
            <article key={i.titulo} className="cartao-beneficio">
              <span className="icone">{i.icone}</span>
              <h3>{i.titulo}</h3>
              <p>{i.texto}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
