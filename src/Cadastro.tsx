import { useState, type FormEvent } from 'react'
import { enviarCadastro, type DadosCadastro, type RespostaCadastro } from './api'
import CamposContato from './CamposContato'
import { DIAS_TESTE } from './oferta'

interface Props {
  onConcluido: (r: RespostaCadastro) => void
}

export const CONTATO_VAZIO: DadosCadastro = { nome: '', email: '', telefone: '', aceite: false, website: '' }

export default function Cadastro({ onConcluido }: Props) {
  const [dados, setDados] = useState<DadosCadastro>(CONTATO_VAZIO)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  const alterar = (campo: keyof DadosCadastro, valor: string | boolean) =>
    setDados((d) => ({ ...d, [campo]: valor }))

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    if (!dados.aceite) {
      setErro('Para liberar o teste, aceite os termos de uso.')
      return
    }
    setEnviando(true)
    const r = await enviarCadastro(dados)
    setEnviando(false)
    if (r.status === 'invalido' || r.status === 'erro') {
      setErro(r.mensagem)
      return
    }
    onConcluido(r)
  }

  return (
    <form onSubmit={enviar} noValidate className="form">
      <h3>Libere seu teste agora</h3>
      <CamposContato
        dados={dados}
        alterar={alterar}
        textoAceite={`Li e aceito que o teste é pessoal, vale por ${DIAS_TESTE} dias úteis da B3 e que operações no mercado envolvem risco.`}
      />
      {erro && <p className="erro">{erro}</p>}
      <button type="submit" className="btn btn-largo" disabled={enviando}>
        {enviando ? 'Liberando seu teste...' : 'Quero meu teste grátis'}
      </button>
      <p className="nota">Seus dados são usados só para liberar o acesso e falar com você sobre a Megan.</p>
    </form>
  )
}
