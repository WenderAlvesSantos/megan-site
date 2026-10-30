const ITENS = [
  {
    icone: '📊',
    titulo: 'Resultado do dia a dia',
    texto: 'Registre suas operações e veja o resultado por dia e por mês, em pontos e em reais, já descontando as taxas.',
  },
  {
    icone: '💰',
    titulo: 'Evolução da banca',
    texto: 'Acompanhe quanto sua banca cresceu desde o início e a queda em relação ao pico, separando simulador e conta real.',
  },
  {
    icone: '📈',
    titulo: 'Plano de contratos',
    texto: 'Saiba quando a banca permite subir a mão com segurança — e quando é hora de reduzir para proteger o capital.',
  },
  {
    icone: '🚨',
    titulo: 'Alertas de desvio',
    texto: 'Se um dia passar da meta ou do stop planejado, você é avisado na hora, inclusive por notificação no celular.',
  },
  {
    icone: '🔮',
    titulo: 'Projeções do mês',
    texto: 'Simule cenários de dias de meta e de stop e veja onde sua banca pode chegar nos próximos meses.',
  },
  {
    icone: '📱',
    titulo: 'No computador e no celular',
    texto: 'Acesse pelo navegador de qualquer lugar e instale como aplicativo no celular, sem baixar nada da loja.',
  },
]

export default function Gerenciamento() {
  return (
    <section id="gerenciamento" className="secao secao-alt">
      <div className="container">
        <p className="kicker">Incluso no seu acesso</p>
        <h2>Megan Trade Manager: seu gerenciamento de risco</h2>
        <p className="texto-apoio intro-secao">
          Junto com a Megan N18 você recebe acesso à plataforma de gerenciamento de risco Megan Trade Manager. O login e
          a senha chegam no mesmo e-mail do download — é só entrar e configurar sua banca.
        </p>
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
