import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../styles/tokens.css'
import { Landing } from './Landing'
import { watchForUpdates } from '../ui/updateToast'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Landing />
  </StrictMode>,
)

watchForUpdates()
