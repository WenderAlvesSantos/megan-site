import { useEffect, useState } from 'react'
import { consultarCompra, type SituacaoCompra } from '../api'
import { POLITICA_CANCELAMENTO } from '../oferta'

const INTERVALO_MS = 4000
const TENTATIVAS = 60

function formatarData(iso?: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}

export default function StatusCompra({ id }: { id: string }) {
  const [situacao, setSituacao] = useState<SituacaoCompra>({ status: 'pendente' })
  const [esgotou, setEsgotou] = useState(false)

  useEffect(() => {
    let ativo = true
    let tentativa = 0
    let timer: ReturnType<typeof setTimeout>
    async function checar() {
      const s = await consultarCompra(id)
      if (!ativo) return
      setSituacao(s)
      tentativa += 1
      if (s.status !== 'pendente') return
      if (tentativa >= TENTATIVAS) setEsgotou(true)
      else timer = setTimeout(checar, INTERVALO_MS)
    }
    checar()
    return () => {
      ativo = false
      clearTimeout(timer)
    }
  }, [id])

  if (situacao.status === 'aprovada') {
    return (
      <div className="confirmacao">
        <span className="icone-ok">✓</span>
        <h3>Pagamento aprovado!</h3>
        {situacao.licencaAte && (
          <p className="destaque">Sua licença anual vale até {formatarData(situacao.licencaAte)}.</p>
        )}
        <p>Enviamos para {situacao.email} o link de download da Megan N18 e o acesso ao Megan Trade Manager.</p>
        <p className="nota">Se você já usa a Megan, basta abrir o programa: a licença é atualizada sozinha.</p>
        <p className="nota">{POLITICA_CANCELAMENTO}</p>
      </div>
    )
  }
  if (situacao.status === 'recusada' || situacao.status === 'nao_encontrada') {
    return (
      <div className="confirmacao">
        <span className="icone-ok">!</span>
        <h3>{situacao.status === 'recusada' ? 'Pagamento não aprovado' : 'Compra não encontrada'}</h3>
        <p>Nenhum valor foi cobrado por esta tentativa. Você pode tentar de novo com outro meio de pagamento.</p>
        <a href="/comprar" className="btn">
          Tentar novamente
        </a>
      </div>
    )
  }
  return (
    <div className="confirmacao">
      <span className="icone-ok carregando">…</span>
      <h3>Aguardando a confirmação do pagamento</h3>
      {esgotou ? (
        <p>
          O Mercado Pago ainda não confirmou. Assim que aprovar, sua licença é liberada automaticamente e você recebe
          o e-mail{situacao.email ? ` em ${situacao.email}` : ''}.
        </p>
      ) : (
        <p>Pix costuma confirmar em poucos segundos. Pode deixar esta página aberta.</p>
      )}
    </div>
  )
}
