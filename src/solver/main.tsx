import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../styles/tokens.css'
import { SolverApp } from './SolverApp'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SolverApp />
  </StrictMode>,
)
