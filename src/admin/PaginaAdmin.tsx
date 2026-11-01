import { useEffect, useState } from 'react'
import './admin.css'
import { ErroAdmin, listarClientes } from './apiAdmin'
import Dashboard from './Dashboard'
import ListaClientes from './ListaClientes'
import LoginAdmin from './LoginAdmin'
import MenuLateral, { type SecaoAdmin } from './MenuLateral'

const CHAVE_SESSAO = 'megan-admin'
const secaoDaUrl = (): SecaoAdmin => (window.location.hash === '#clientes' ? 'clientes' : 'dashboard')

export default function PaginaAdmin() {
  const [senha, setSenha] = useState(() => sessionStorage.getItem(CHAVE_SESSAO) ?? '')
  const [secao, setSecao] = useState<SecaoAdmin>(secaoDaUrl)
  const [aviso, setAviso] = useState('')
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    document.title = 'Megan N18 — Suporte'
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    const voltar = () => setSecao(secaoDaUrl())
    window.addEventListener('hashchange', voltar)
    return () => {
      meta.remove()
      window.removeEventListener('hashchange', voltar)
    }
  }, [])

  async function entrar(s: string) {
    setOcupado(true)
    setAviso('')
    try {
      await listarClientes(s, { q: '', status: '', pagina: 1 })
      sessionStorage.setItem(CHAVE_SESSAO, s)
      setSenha(s)
    } catch (e) {
      setAviso(e instanceof ErroAdmin && e.status === 401 ? 'Senha incorreta.' : (e as Error).message)
    } finally {
      setOcupado(false)
    }
  }

  function sair() {
    sessionStorage.removeItem(CHAVE_SESSAO)
    setSenha('')
  }

  function ir(s: SecaoAdmin) {
    window.location.hash = s
    setSecao(s)
  }

  if (!senha) return <LoginAdmin aviso={aviso} ocupado={ocupado} onEntrar={entrar} />

  return (
    <div className="admin-app">
      <MenuLateral ativa={secao} onIr={ir} onSair={sair} />
      {secao === 'dashboard' ? <Dashboard senha={senha} /> : <ListaClientes senha={senha} />}
    </div>
  )
}
