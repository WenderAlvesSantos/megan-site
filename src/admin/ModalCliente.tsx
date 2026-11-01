import { useCallback, useEffect, useState } from 'react'
import { configGerenciadorCliente, detalheCliente, novaChave, reembolsar, type ClienteAdmin } from './apiAdmin'
import { data, dataHora, moeda } from './formato'
import SeloStatus from './SeloStatus'

const EVENTOS: Record<string, string> = {
  chave_gerada: 'Chave gerada',
  ativada: 'Ativada no computador',
  outra_maquina: 'Tentou em OUTRO computador',
  chave_invalida: 'Digitou chave errada',
  reembolso: 'Compra reembolsada',
}

const RESULTADO_GERENCIADOR = {
  aplicado: 'Configuração da Megan aplicada no trade-manager nas contas Real e Simulador (WIN). Banca e contratos foram mantidos.',
  ja_tinha: 'Nada foi alterado no trade-manager.',
  sem_conta: 'Este e-mail não tem conta no trade-manager.',
}

const PLANOS: Record<string, string> = { trial: 'Teste gratuito', anual: 'Licença anual', licenca: 'Licença (sem vencimento)' }

interface Props {
  senha: string
  email: string
  onFechar: () => void
  onAtualizar: () => void
}

export default function ModalCliente({ senha, email, onFechar, onAtualizar }: Props) {
  const [c, setC] = useState<ClienteAdmin | null>(null)
  const [erro, setErro] = useState('')
  const [resultado, setResultado] = useState('')
  const [ocupado, setOcupado] = useState(false)

  const carregar = useCallback(() => {
    detalheCliente(senha, email).then(setC).catch((e: Error) => setErro(e.message))
  }, [senha, email])

  useEffect(() => {
    carregar()
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onFechar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [carregar, onFechar])

  async function executar(acao: () => Promise<string>) {
    setOcupado(true)
    setResultado('')
    try {
      setResultado(await acao())
      carregar()
      onAtualizar()
    } catch (e) {
      setResultado(`Erro: ${(e as Error).message}`)
    } finally {
      setOcupado(false)
    }
  }

  const gerarChave = () => {
    if (!window.confirm(`Gerar nova chave para ${email}?\n\nA chave atual deixa de funcionar e o computador é liberado.`)) return
    executar(async () => {
      const r = await novaChave(senha, email)
      return `Nova chave: ${r.chave} — ${r.emailEnviado ? 'enviada por e-mail' : 'o e-mail FALHOU, envie manualmente'}`
    })
  }

  const cancelarReembolsar = () => {
    if (!c?.compra) return
    if (
      !window.confirm(
        `Cancelar a licença anual de ${email} e devolver ${moeda(c.compra.valor)} pelo Mercado Pago?\n\n` +
          'O estorno é total (Pix devolvido / cartão: parcelas canceladas) e a licença deste ano é encerrada. Não dá para desfazer.',
      )
    )
      return
    executar(async () => {
      const r = await reembolsar(senha, email)
      const ate = new Date(r.licencaAte).getTime() > Date.now() + 60_000 ? ` Licença do ano anterior segue até ${dataHora(r.licencaAte)}.` : ' Licença encerrada.'
      return `Reembolso feito.${ate} ${r.emailEnviado ? 'Cliente avisado por e-mail.' : 'O e-mail ao cliente FALHOU — avise manualmente.'}`
    })
  }

  const configurar = () => {
    if (
      !window.confirm(
        `Aplicar a configuração da Megan no trade-manager de ${email}, nas contas Real e Simulador (WIN)?\n\n` +
          'As regras atuais (stop, meta, risco, folga e máximo de contratos) serão substituídas. ' +
          'Banca e contratos são mantidos; sem banca, entra a padrão de R$ 1.000 para o cliente confirmar.',
      )
    )
      return
    executar(async () => RESULTADO_GERENCIADOR[(await configGerenciadorCliente(senha, email)).status])
  }

  return (
    <div className="modal-fundo" onMouseDown={(e) => e.target === e.currentTarget && onFechar()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={`Cliente ${email}`}>
        <header className="modal-topo">
          <div>
            <h2>{c?.nome || (c ? '(sem nome)' : 'Carregando...')}</h2>
            <p>
              {email}
              {c?.telefone ? ` · ${c.telefone}` : ''}
            </p>
          </div>
          {c && <SeloStatus status={c.status} />}
          <button type="button" className="modal-fechar" onClick={onFechar} aria-label="Fechar">
            ×
          </button>
        </header>

        {erro && <p className="aviso erro">{erro}</p>}
        {c && (
          <div className="modal-corpo">
            <section>
              <h4>Licença</h4>
              <dl>
                <dt>Plano</dt>
                <dd>{PLANOS[c.plano] ?? c.plano}</dd>
                <dt>Vence em</dt>
                <dd>{c.venceEm ? dataHora(c.venceEm) : 'sem vencimento'}</dd>
                <dt>Contratos</dt>
                <dd>{c.contratos > 0 ? c.contratos : 'sem limite'}</dd>
                <dt>Cadastro</dt>
                <dd>
                  {data(c.cadastradoEm)}
                  {c.origem ? ` · via ${c.origem}` : ''}
                </dd>
              </dl>
            </section>
            <section>
              <h4>Chave e computador</h4>
              <dl>
                <dt>Chave</dt>
                <dd>{c.chaveFinal ? `MEGN-••••-••••-••••-${c.chaveFinal}` : 'sem chave'}</dd>
                <dt>Gerada em</dt>
                <dd>{dataHora(c.chaveGeradaEm)}</dd>
                <dt>Computador</dt>
                <dd>{c.vinculadaEm === null ? 'ainda não ativada' : `ativada em ${dataHora(c.vinculadaEm)}`}</dd>
                <dt>Último acesso</dt>
                <dd>{dataHora(c.ultimaConsulta)}</dd>
              </dl>
            </section>
            {c.compra && (
              <section>
                <h4>Compra</h4>
                <dl>
                  <dt>Valor</dt>
                  <dd>{moeda(c.compra.valor)}</dd>
                  <dt>Paga em</dt>
                  <dd>{dataHora(c.compra.pagaEm)}</dd>
                  <dt>Arrependimento</dt>
                  <dd>
                    {c.compra.reembolsadaEm
                      ? `reembolsada em ${dataHora(c.compra.reembolsadaEm)}${c.compra.reembolsoOrigem === 'mercadopago' ? ' (direto no Mercado Pago)' : ''}`
                      : c.compra.podeReembolsar
                        ? `pode desistir até ${dataHora(c.compra.arrependimentoAte)}`
                        : `prazo terminou em ${dataHora(c.compra.arrependimentoAte)} — sem reembolso`}
                  </dd>
                </dl>
              </section>
            )}
            <section>
              <h4>Trade-manager</h4>
              <dl>
                <dt>Configuração</dt>
                <dd>{c.gerenciadorConfigEm ? `rotina aplicada em ${dataHora(c.gerenciadorConfigEm)}` : 'rotina ainda não aplicada'}</dd>
              </dl>
            </section>
            {c.eventos.length > 0 && (
              <section className="modal-eventos">
                <h4>Histórico recente</h4>
                <ul>
                  {c.eventos.map((e, i) => (
                    <li key={i}>
                      <time>{dataHora(e.em)}</time> {EVENTOS[e.tipo] ?? e.tipo}
                      {e.detalhe ? ` (${e.detalhe})` : ''}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}

        {resultado && <p className="aviso modal-resultado">{resultado}</p>}
        <footer className="modal-acoes">
          {c?.compra && !c.compra.reembolsadaEm && (
            <button
              type="button"
              className="btn btn-perigo btn-pequeno"
              onClick={cancelarReembolsar}
              disabled={ocupado || !c.compra.podeReembolsar}
              title={c.compra.podeReembolsar ? 'Estorna o pagamento e encerra a licença deste ano' : 'Prazo de 7 dias encerrado — sem reembolso'}
            >
              Cancelar e reembolsar
            </button>
          )}
          <button type="button" className="btn btn-fantasma btn-pequeno" onClick={configurar} disabled={!c || ocupado}>
            Configurar trade-manager
          </button>
          <button type="button" className="btn btn-pequeno" onClick={gerarChave} disabled={!c || ocupado}>
            {ocupado ? 'Aguarde...' : 'Gerar nova chave'}
          </button>
        </footer>
      </div>
    </div>
  )
}
