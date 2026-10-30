import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import PaginaCompra from './compra/PaginaCompra'
import './styles.css'

// /comprar só por link direto: não há link para ela na landing page
const Pagina = window.location.pathname.replace(/\/+$/, '') === '/comprar' ? PaginaCompra : App

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Pagina />
  </StrictMode>,
)
