import { useCallback, useEffect, useState, type FormEvent } from 'react'
import AcoesLote from './AcoesLote'
import { listarClientes, type PaginaClientes } from './apiAdmin'
import { inteiro, ORDEM_STATUS, STATUS } from './formato'
import ModalCliente from './ModalCliente'
import SeloStatus from './SeloStatus'

export default function ListaClientes({ senha }: { senha: string }) {
  const [termo, setTermo] = useState('')
  const [filtros, setFiltros] = useState({ q: '', status: '', pagina: 1 })
  const [dados, setDados] = useState<PaginaClientes | null>(null)
  const [aviso, setAviso] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [aberto, setAberto] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setOcupado(true)
    try {
      setDados(await listarClientes(senha, filtros))
    } catch (e) {
      setAviso((e as Error).message)
    } finally {
      setOcupado(false)
    }
  }, [senha, filtros])

  useEffect(() => {
    carregar()
  }, [carregar])

  const paginas = dados ? Math.max(1, Math.ceil(dados.total / dados.porPagina)) : 1
  const irPara = (pagina: number) => setFiltros((f) => ({ ...f, pagina }))

  return (
    <section className="admin-conteudo">
      <header className="admin-topo">
        <div>
          <h1>Clientes</h1>
          <p>{dados ? `${inteiro(dados.total)} cliente(s) encontrados` : 'Carregando...'}</p>
        </div>
        <AcoesLote senha={senha} onAviso={setAviso} onConcluir={carregar} />
      </header>

      <form
        className="lista-filtros"
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          setFiltros((f) => ({ ...f, q: termo.trim(), pagina: 1 }))
        }}
      >
        <input placeholder="Buscar por nome ou e-mail" value={termo} onChange={(e) => setTermo(e.target.value)} />
        <select value={filtros.status} onChange={(e) => setFiltros((f) => ({ ...f, status: e.target.value, pagina: 1 }))}>
          <option value="">Todos os status</option>
          {ORDEM_STATUS.map((s) => (
            <option key={s} value={s}>
              {STATUS[s].rotulo}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-pequeno" disabled={ocupado}>
          Buscar
        </button>
      </form>

      {aviso && (
        <p className="aviso" onClick={() => setAviso('')}>
          {aviso}
        </p>
      )}

      <div className={`tabela-wrap ${ocupado ? 'carregando' : ''}`}>
        <table className="tabela">
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Status</th>
              <th aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {dados?.clientes.map((c) => (
              <tr key={c.email}>
                <td className="nome">{c.nome || '(sem nome)'}</td>
                <td className="email">{c.email}</td>
                <td>
                  <SeloStatus status={c.status} />
                </td>
                <td className="acoes">
                  <button type="button" className="btn-ver" onClick={() => setAberto(c.email)} title="Visualizar cliente">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 5C6.5 5 2.7 9.2 1.5 12c1.2 2.8 5 7 10.5 7s9.3-4.2 10.5-7C21.3 9.2 17.5 5 12 5Zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm0-2.2a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6Z" />
                    </svg>
                    Visualizar
                  </button>
                </td>
              </tr>
            ))}
            {dados?.clientes.length === 0 && (
              <tr>
                <td colSpan={4} className="vazio">
                  Nenhum cliente encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {dados && paginas > 1 && (
        <nav className="paginacao">
          <button type="button" onClick={() => irPara(dados.pagina - 1)} disabled={ocupado || dados.pagina <= 1}>
            ‹ Anterior
          </button>
          <span>
            Página {dados.pagina} de {paginas}
          </span>
          <button type="button" onClick={() => irPara(dados.pagina + 1)} disabled={ocupado || dados.pagina >= paginas}>
            Próxima ›
          </button>
        </nav>
      )}

      {aberto && <ModalCliente senha={senha} email={aberto} onFechar={() => setAberto(null)} onAtualizar={carregar} />}
    </section>
  )
}
