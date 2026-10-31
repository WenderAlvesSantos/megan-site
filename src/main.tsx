import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import PaginaCompra from './compra/PaginaCompra'
import './styles.css'

const PaginaAdmin = lazy(() => import('./admin/PaginaAdmin'))

// /comprar e /admin só por link direto: não há link para elas na landing page
const ROTAS: Record<string, () => JSX.Element> = {
  '/comprar': () => <PaginaCompra />,
  '/admin': () => (
    <Suspense fallback={null}>
      <PaginaAdmin />
    </Suspense>
  ),
}
const rota = ROTAS[window.location.pathname.replace(/\/+$/, '')]

createRoot(document.getElementById('root')!).render(<StrictMode>{rota ? rota() : <App />}</StrictMode>)
