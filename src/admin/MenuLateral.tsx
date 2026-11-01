export type SecaoAdmin = 'dashboard' | 'clientes'

const ITENS: { id: SecaoAdmin; rotulo: string; icone: string }[] = [
  { id: 'dashboard', rotulo: 'Dashboard', icone: 'M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z' },
  {
    id: 'clientes',
    rotulo: 'Clientes',
    icone:
      'M16 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4ZM8 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm8 2c-2.7 0-8 1.3-8 4v3h16v-3c0-2.7-5.3-4-8-4ZM8 13c-.3 0-.7 0-1.1.1A4.5 4.5 0 0 1 9 17v3H1v-3c0-2.3 4.7-4 7-4Z',
  },
]

interface Props {
  ativa: SecaoAdmin
  onIr: (s: SecaoAdmin) => void
  onSair: () => void
}

export default function MenuLateral({ ativa, onIr, onSair }: Props) {
  return (
    <aside className="admin-menu">
      <div className="admin-marca">
        Megan <span>N18</span>
        <small>Suporte</small>
      </div>
      <nav>
        {ITENS.map((item) => (
          <button key={item.id} type="button" className={item.id === ativa ? 'ativo' : ''} onClick={() => onIr(item.id)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d={item.icone} />
            </svg>
            {item.rotulo}
          </button>
        ))}
      </nav>
      <button type="button" className="admin-sair" onClick={onSair}>
        Sair
      </button>
    </aside>
  )
}
