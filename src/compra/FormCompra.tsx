import { useState, type FormEvent } from 'react'
import { iniciarCheckout, type DadosCadastro } from '../api'
import { CONTATO_VAZIO } from '../Cadastro'
import CamposContato from '../CamposContato'
import { DIAS_ARREPENDIMENTO, PRECO_ANUAL, precoFormatado } from '../oferta'

export default function FormCompra() {
  const [dados, setDados] = useState<DadosCadastro>(CONTATO_VAZIO)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  const alterar = (campo: keyof DadosCadastro, valor: string | boolean) =>
    setDados((d) => ({ ...d, [campo]: valor }))

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    if (!dados.aceite) {
      setErro('Para continuar, aceite os termos de uso.')
      return
    }
    setEnviando(true)
    const r = await iniciarCheckout(dados)
    if (r.status === 'ok') {
      window.location.href = r.url
      return
    }
    setEnviando(false)
    setErro(r.mensagem)
  }

  return (
    <form onSubmit={enviar} noValidate className="form">
      <h3>Seus dados para a licença</h3>
      <CamposContato
        dados={dados}
        alterar={alterar}
        textoAceite={`Li e aceito os termos de uso da Megan N18: a licença é pessoal, vale por 12 meses e operações no mercado envolvem risco. Posso desistir em até ${DIAS_ARREPENDIMENTO} dias com reembolso total; depois disso, não há reembolso.`}
      />
      {erro && <p className="erro">{erro}</p>}
      <button type="submit" className="btn btn-largo" disabled={enviando}>
        {enviando ? 'Abrindo o pagamento...' : `Ir para o pagamento · ${precoFormatado(PRECO_ANUAL)}`}
      </button>
      <p className="nota">Você será levado ao ambiente seguro do Mercado Pago para pagar com Pix ou cartão.</p>
    </form>
  )
}
