import { useState, type FormEvent } from 'react'

interface Props {
  aviso: string
  ocupado: boolean
  onEntrar: (senha: string) => void
}

export default function LoginAdmin({ aviso, ocupado, onEntrar }: Props) {
  const [senha, setSenha] = useState('')
  return (
    <main className="admin-login">
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          onEntrar(senha)
        }}
      >
        <div className="admin-marca">
          Megan <span>N18</span>
          <small>Suporte</small>
        </div>
        <label>
          Senha do suporte
          <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoFocus />
        </label>
        {aviso && <p className="aviso erro">{aviso}</p>}
        <button type="submit" className="btn btn-largo" disabled={ocupado || !senha}>
          {ocupado ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}
