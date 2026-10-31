import { useState } from 'react'
import { novaChave, type ClienteAdmin } from './apiAdmin'

const EVENTOS: Record<string, string> = {
  chave_gerada: 'Chave gerada',
  ativada: 'Ativada no computador',
  outra_maquina: 'Tentou em OUTRO computador',
  chave_invalida: 'Digitou chave errada',
}

const quando = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }) : '—'

interface Props {
  cliente: ClienteAdmin
  senha: string
  onAtualizar: () => void
}

export default function CartaoCliente({ cliente: c, senha, onAtualizar }: Props) {
  const [gerando, setGerando] = useState(false)
  const [resultado, setResultado] = useState('')

  async function gerar() {
    if (!window.confirm(`Gerar nova chave para ${c.email}?\n\nA chave atual deixa de funcionar e o computador é liberado.`)) return
    setGerando(true)
    try {
      const r = await novaChave(senha, c.email)
      setResultado(`Nova chave: ${r.chave} — ${r.emailEnviado ? 'enviada por e-mail' : 'FALHOU o e-mail, envie manualmente'}`)
      onAtualizar()
    } catch (e) {
      setResultado(`Erro: ${(e as Error).message}`)
    } finally {
      setGerando(false)
    }
  }

  return (
    <article className="admin-cliente">
      <header>
        <div>
          <h3>{c.nome || '(sem nome)'}</h3>
          <p>{c.email}{c.telefone ? ` · ${c.telefone}` : ''}</p>
        </div>
        <span className={c.liberado ? 'tag ok' : 'tag off'}>{c.liberado ? 'Liberado' : 'Bloqueado'}</span>
      </header>
      <dl>
        <dt>Plano</dt><dd>{c.plano}{c.venceEm ? ` até ${quando(c.venceEm)}` : ''}</dd>
        <dt>Chave</dt><dd>{c.chaveFinal ? `MEGN-••••-••••-••••-${c.chaveFinal} (gerada ${quando(c.chaveGeradaEm)})` : 'sem chave'}</dd>
        <dt>Computador</dt><dd>{c.vinculadaEm === null ? 'ainda não ativada' : `ativada em ${quando(c.vinculadaEm)}`}</dd>
        <dt>Último acesso</dt><dd>{quando(c.ultimaConsulta)}</dd>
      </dl>
      {c.eventos.length > 0 && (
        <ul className="admin-eventos">
          {c.eventos.map((e, i) => (
            <li key={i}>{quando(e.em)} — {EVENTOS[e.tipo] ?? e.tipo}{e.detalhe ? ` (${e.detalhe})` : ''}</li>
          ))}
        </ul>
      )}
      <button type="button" className="btn" onClick={gerar} disabled={gerando}>
        {gerando ? 'Gerando...' : 'Gerar nova chave (troca de computador)'}
      </button>
      {resultado && <p className="destaque admin-resultado">{resultado}</p>}
    </article>
  )
}
