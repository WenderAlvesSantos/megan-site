import { DIAS_TESTE } from '../oferta'

const PASSOS = [
  {
    titulo: 'Cadastre-se',
    texto: `Preencha nome, e-mail e celular. O teste de ${DIAS_TESTE} dias úteis é liberado na hora, sem cartão.`,
  },
  {
    titulo: 'Instale e abra',
    texto:
      'Você recebe no e-mail o instalador da Megan N18 e o login do Megan Trade Manager. Instale em poucos cliques e abra pelo atalho na Área de Trabalho.',
  },
  {
    titulo: 'Conecte e acompanhe',
    texto: 'Entre com seu e-mail, conecte ao seu MetaTrader 5 e comece no simulado. Quando quiser, vá para o real.',
  },
]

export default function ComoFunciona() {
  return (
    <section id="como-funciona" className="secao">
      <div className="container">
        <p className="kicker">Como funciona</p>
        <h2>Em poucos minutos a Megan está trabalhando para você</h2>
        <ol className="passos">
          {PASSOS.map((p, i) => (
            <li key={p.titulo} className="passo">
              <span className="numero">{i + 1}</span>
              <h3>{p.titulo}</h3>
              <p>{p.texto}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
