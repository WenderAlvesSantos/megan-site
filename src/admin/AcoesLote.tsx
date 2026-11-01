import { useState } from 'react'
import { configGerenciador, gerarFaltantes } from './apiAdmin'

interface Props {
  senha: string
  onAviso: (texto: string) => void
  onConcluir: () => void
}

/** Rotinas em lote: repetem a chamada (um lote por vez) até não restar ninguém. */
export default function AcoesLote({ senha, onAviso, onConcluir }: Props) {
  const [ocupado, setOcupado] = useState(false)

  async function chaves() {
    if (!window.confirm('Gerar e enviar por e-mail a chave de todos os clientes com acesso válido que ainda não têm chave?')) return
    setOcupado(true)
    let total = 0
    const falhas: string[] = []
    try {
      for (;;) {
        const r = await gerarFaltantes(senha)
        total += r.geradas
        falhas.push(...r.semEmail)
        onAviso(`Chaves geradas: ${total}...`)
        if (r.restantes <= 0 || r.geradas === 0) break
      }
      onAviso(`Chaves geradas: ${total}.${falhas.length ? ` E-mail falhou para: ${falhas.join(', ')}` : ''}`)
      onConcluir()
    } catch (e) {
      onAviso(`Erro após ${total} chaves: ${(e as Error).message}`)
    } finally {
      setOcupado(false)
    }
  }

  async function gerenciador() {
    if (!window.confirm('Aplicar a configuração da Megan (WIN Real + Simulador) no trade-manager dos clientes que ainda não têm? Configurações existentes não são alteradas.')) return
    setOcupado(true)
    let aplicados = 0
    let jaTinham = 0
    let semConta = 0
    try {
      for (;;) {
        const r = await configGerenciador(senha)
        aplicados += r.aplicados
        jaTinham += r.jaTinham
        semConta += r.semConta.length
        onAviso(`Trade-manager: ${aplicados} configurado(s)... faltam ${r.restantes}`)
        if (r.restantes <= 0 || r.aplicados + r.jaTinham + r.semConta.length === 0) break
      }
      onAviso(`Trade-manager: ${aplicados} configurado(s), ${jaTinham} já tinham configuração${semConta ? `, ${semConta} sem conta` : ''}.`)
      onConcluir()
    } catch (e) {
      onAviso(`Erro após ${aplicados} cliente(s): ${(e as Error).message}`)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <details className="acoes-lote">
      <summary>Ações em lote</summary>
      <div>
        <button type="button" className="btn btn-fantasma btn-pequeno" onClick={chaves} disabled={ocupado}>
          Gerar chaves para quem não tem
        </button>
        <button type="button" className="btn btn-fantasma btn-pequeno" onClick={gerenciador} disabled={ocupado}>
          Configurar trade-manager dos clientes antigos
        </button>
      </div>
    </details>
  )
}
