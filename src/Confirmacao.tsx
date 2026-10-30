import type { RespostaCadastro } from './api'

interface Props {
  resultado: RespostaCadastro
  onVoltar: () => void
}

function formatarData(iso?: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function Confirmacao({ resultado, onVoltar }: Props) {
  const criado = resultado.status === 'criado'
  return (
    <div className="confirmacao">
      <span className="icone-ok">{criado ? '✓' : 'i'}</span>
      <h3>{criado ? 'Teste liberado!' : 'Você já tem cadastro'}</h3>
      <p>{resultado.mensagem}</p>
      {criado && resultado.venceEm && (
        <p className="destaque">Seu teste vale até {formatarData(resultado.venceEm)} (horário de Brasília).</p>
      )}
      {criado && (
        <ol className="passos-curtos">
          <li>Abra o e-mail que enviamos (confira também o spam).</li>
          <li>Baixe o MeganN18.zip e extraia a pasta inteira.</li>
          <li>Abra o MeganN18.exe e entre com o e-mail cadastrado.</li>
          <li>No mesmo e-mail estão o link e a senha do Megan Trade Manager, seu gerenciamento de risco.</li>
        </ol>
      )}
      <button type="button" className="btn btn-fantasma" onClick={onVoltar}>
        Voltar
      </button>
    </div>
  )
}
