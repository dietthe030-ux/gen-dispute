import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { DocsPage } from './DocsPage.tsx'

const normalizedPath = window.location.pathname.replace(/\/+$/, '') || '/'
const page = normalizedPath === '/docs' ? <DocsPage /> : <App />

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {page}
  </StrictMode>,
)
