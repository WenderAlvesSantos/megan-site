import { useEffect, useState, type FormEvent } from 'react'
import { buscarClientes, ErroAdmin, gerarFaltantes, type ClienteAdmin } from './apiAdmin'
import CartaoCliente from './CartaoCliente'

const CHAVE_SESSAO = 'megan-admin'

export default function PaginaAdmin() {
  const [senha, setSenha] = useState(() => sessionStorage.getItem(CHAVE_SESSAO) ?? '')
  const [digitada, setDigitada] = useState('')
  const [termo, setTermo] = useState('')
  const [clientes, setClientes] = useState<ClienteAdmin[] | null>(null)
  const [aviso, setAviso] = useState('')
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    document.title = 'Megan N18 — Suporte'
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])

  async function carregar(s = senha, q = termo) {
    setOcupado(true)
    setAviso('')
    try {
      setClientes(await buscarClientes(s, q))
      sessionStorage.setItem(CHAVE_SESSAO, s)
      setSenha(s)
    } catch (e) {
      if (e instanceof ErroAdmin && e.status === 401) {
        sessionStorage.removeItem(CHAVE_SESSAO)
        setSenha('')
      }
      setAviso((e as Error).message)
    } finally {
      setOcupado(false)
    }
  }

  async function migrar() {
    if (!window.confirm('Gerar e enviar por e-mail a chave de todos os clientes com acesso válido que ainda não têm chave?')) return
    setOcupado(true)
    let total = 0
    const falhas: string[] = []
    try {
      for (;;) {
        const r = await gerarFaltantes(senha)
        total += r.geradas
        falhas.push(...r.semEmail)
        setAviso(`Chaves geradas: ${total}...`)
        if (r.restantes <= 0 || r.geradas === 0) break
      }
      setAviso(`Chaves geradas: ${total}.${falhas.length ? ` E-mail falhou para: ${falhas.join(', ')}` : ''}`)
      await carregar()
    } catch (e) {
      setAviso(`Erro após ${total} chaves: ${(e as Error).message}`)
    } finally {
      setOcupado(false)
    }
  }

  if (!senha) {
    return (
      <main className="secao admin">
        <form
          className="cartao-form form admin-login"
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            carregar(digitada, '')
          }}
        >
          <h3>Suporte Megan N18</h3>
          <label>
            Senha
            <input type="password" value={digitada} onChange={(e) => setDigitada(e.target.value)} autoFocus />
          </label>
          {aviso && <p className="erro">{aviso}</p>}
          <button type="submit" className="btn btn-largo" disabled={ocupado || !digitada}>
            Entrar
          </button>
        </form>
      </main>
    )
  }

  return (
    <main className="secao admin">
      <div className="container">
        <h2>Suporte · Chaves de ativação</h2>
        <form
          className="admin-busca"
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            carregar()
          }}
        >
          <input placeholder="E-mail ou nome do cliente" value={termo} onChange={(e) => setTermo(e.target.value)} />
          <button type="submit" className="btn" disabled={ocupado}>Buscar</button>
          <button type="button" className="btn btn-fantasma" onClick={migrar} disabled={ocupado}>
            Gerar chaves para quem não tem
          </button>
          <button
            type="button"
            className="btn btn-fantasma"
            onClick={() => {
              sessionStorage.removeItem(CHAVE_SESSAO)
              setSenha('')
              setClientes(null)
            }}
          >
            Sair
          </button>
        </form>
        {aviso && <p className="destaque">{aviso}</p>}
        {clientes === null && <p className="texto-apoio">Busque um cliente (vazio = 20 cadastros mais recentes).</p>}
        {clientes?.length === 0 && <p className="texto-apoio">Nenhum cliente encontrado.</p>}
        <div className="admin-lista">
          {clientes?.map((c) => <CartaoCliente key={c.email} cliente={c} senha={senha} onAtualizar={() => carregar()} />)}
        </div>
      </div>
    </main>
  )
}
