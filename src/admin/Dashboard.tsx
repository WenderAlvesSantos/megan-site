import { useEffect, useState } from 'react'
import { carregarPainel, type Painel } from './apiAdmin'
import CartaoKpi from './CartaoKpi'
import FiltrosPainel, { filtroDosUltimos, type FiltroPainel } from './FiltrosPainel'
import { inteiro, moeda, moedaCurta, ORDEM_STATUS, porcento, rotuloBalde, STATUS } from './formato'
import { LARGURA_LARGA } from './graficos/escala'
import GraficoBarras from './graficos/GraficoBarras'
import GraficoLinhas from './graficos/GraficoLinhas'
import GraficoRosca from './graficos/GraficoRosca'

const CORES = { receita: '#22d3ee', novos: '#3b82f6', testes: '#fbbf24', assinaturas: '#34d399' }

export default function Dashboard({ senha }: { senha: string }) {
  const [filtro, setFiltro] = useState<FiltroPainel>(() => filtroDosUltimos(30))
  const [painel, setPainel] = useState<Painel | null>(null)
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    let vivo = true
    setOcupado(true)
    setErro('')
    carregarPainel(senha, filtro)
      .then((p) => vivo && setPainel(p))
      .catch((e: Error) => vivo && setErro(e.message))
      .finally(() => vivo && setOcupado(false))
    return () => {
      vivo = false
    }
  }, [senha, filtro])

  const rotulos = painel ? painel.serie.map((b) => rotuloBalde(b.chave, painel.periodo.agrupar)) : []
  let soma = 0
  const acumulada = painel ? painel.serie.map((b) => (soma += b.receita)) : []

  return (
    <section className="admin-conteudo">
      <header className="admin-topo">
        <div>
          <h1>Dashboard</h1>
          <p>Vendas, cadastros e situação dos clientes da Megan N18.</p>
        </div>
      </header>
      <FiltrosPainel filtro={filtro} onMudar={setFiltro} ocupado={ocupado} />
      {erro && <p className="aviso erro">{erro}</p>}
      {painel && (
        <div className={ocupado ? 'carregando' : ''}>
          <div className="kpis">
            <CartaoKpi titulo="Receita bruta" valor={moeda(painel.kpis.receita)} atual={painel.kpis.receita} anterior={painel.anterior.receita} />
            <CartaoKpi titulo="Assinaturas" valor={inteiro(painel.kpis.assinaturas)} atual={painel.kpis.assinaturas} anterior={painel.anterior.assinaturas} />
            <CartaoKpi titulo="Ticket médio" valor={moeda(painel.kpis.ticketMedio)} atual={painel.kpis.ticketMedio} anterior={painel.anterior.ticketMedio} />
            <CartaoKpi titulo="Novos clientes" valor={inteiro(painel.kpis.novosClientes)} atual={painel.kpis.novosClientes} anterior={painel.anterior.novosClientes} />
            <CartaoKpi titulo="Testes iniciados" valor={inteiro(painel.kpis.testes)} atual={painel.kpis.testes} anterior={painel.anterior.testes} />
            <CartaoKpi
              titulo="Conversão teste → assinatura"
              valor={porcento(painel.kpis.conversao)}
              dica="Dos testes iniciados no período, quantos já compraram a licença"
            />
          </div>
          <div className="kpis kpis-agora">
            <CartaoKpi titulo="Em teste agora" valor={inteiro(painel.situacao.teste)} />
            <CartaoKpi titulo="Assinantes ativos" valor={inteiro(painel.situacao.assinante)} />
            <CartaoKpi titulo="Testes vencidos sem assinar" valor={inteiro(painel.situacao.teste_vencido)} />
            <CartaoKpi titulo="Total de clientes" valor={inteiro(painel.totalClientes)} />
          </div>
          <div className="graficos">
            <article className="cartao-grafico largo">
              <h3>Receita bruta</h3>
              <GraficoBarras
                rotulos={rotulos}
                valores={painel.serie.map((b) => b.receita)}
                cor={CORES.receita}
                formatar={moedaCurta}
                largura={LARGURA_LARGA}
              />
            </article>
            <article className="cartao-grafico">
              <h3>Receita acumulada no período</h3>
              <GraficoLinhas rotulos={rotulos} series={[{ nome: 'Receita acumulada', cor: CORES.receita, valores: acumulada }]} formatar={moedaCurta} />
            </article>
            <article className="cartao-grafico">
              <h3>Situação atual dos clientes</h3>
              <GraficoRosca
                centro={inteiro(painel.totalClientes)}
                legendaCentro="clientes"
                fatias={ORDEM_STATUS.map((s) => ({ rotulo: STATUS[s].rotulo, valor: painel.situacao[s], cor: STATUS[s].cor }))}
              />
            </article>
            <article className="cartao-grafico largo">
              <h3>Novos clientes, testes e assinaturas</h3>
              <GraficoLinhas
                rotulos={rotulos}
                largura={LARGURA_LARGA}
                formatar={(v) => inteiro(Math.round(v))}
                series={[
                  { nome: 'Novos clientes', cor: CORES.novos, valores: painel.serie.map((b) => b.novosClientes) },
                  { nome: 'Testes iniciados', cor: CORES.testes, valores: painel.serie.map((b) => b.testes) },
                  { nome: 'Assinaturas', cor: CORES.assinaturas, valores: painel.serie.map((b) => b.assinaturas) },
                ]}
              />
            </article>
          </div>
        </div>
      )}
    </section>
  )
}
