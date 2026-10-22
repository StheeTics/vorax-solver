import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../styles/tokens.css'
import { Landing } from './Landing'
import { startPage } from '../ui/siteMove'
import { watchForUpdates } from '../ui/updateToast'

void startPage(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Landing />
    </StrictMode>,
  )
  watchForUpdates()
})
