import { DIAS_TESTE } from '../oferta'

const PERGUNTAS = [
  {
    p: 'Preciso pagar alguma coisa para testar?',
    r: `Não. O teste é gratuito por ${DIAS_TESTE} dias úteis do pregão e não pedimos cartão de crédito.`,
  },
  {
    p: 'Posso testar sem arriscar dinheiro?',
    r: 'Sim. A Megan N18 tem modo simulado e replay de pregões, ideal para conhecer o funcionamento antes de operar no real.',
  },
  {
    p: 'A Megan mexe no meu dinheiro?',
    r: 'Não. Seu saldo fica na sua corretora. A Megan apenas envia as ordens pelo seu MetaTrader 5, como você faria manualmente.',
  },
  {
    p: 'O que é o Megan Trade Manager?',
    r: 'É a plataforma de gerenciamento de risco que acompanha a Megan N18. Nela você controla banca, resultados, plano de contratos e recebe alertas quando um dia sai do planejado. O acesso é criado junto com o seu cadastro e a senha chega no seu e-mail.',
  },
  {
    p: 'Preciso ficar na frente do computador?',
    r: 'Não precisa ficar clicando. Basta deixar o computador ligado, com o MetaTrader 5 aberto, durante o horário de operação.',
  },
  {
    p: `O que acontece depois dos ${DIAS_TESTE} dias úteis?`,
    r: 'O acesso de teste é encerrado automaticamente. Se gostar, fale com a gente para contratar e continuar usando.',
  },
  {
    p: 'Funciona em qual corretora?',
    r: 'Em corretoras que ofereçam o MetaTrader 5 para o mini-índice (WIN) com negociação por robô (Algo Trading) liberada. Na dúvida, chame no WhatsApp que ajudamos.',
  },
]

export default function Faq() {
  return (
    <section id="faq" className="secao">
      <div className="container faq">
        <p className="kicker">Dúvidas frequentes</p>
        <h2>Perguntas e respostas</h2>
        {PERGUNTAS.map((q) => (
          <details key={q.p}>
            <summary>{q.p}</summary>
            <p>{q.r}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
