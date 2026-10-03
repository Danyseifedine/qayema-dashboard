import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/styles/globals.css'
import App from '@/App'
import { reloadOnNewRelease } from '@/app/new-release'
import { AppProviders } from '@/app/providers/app-providers'

reloadOnNewRelease()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
)
