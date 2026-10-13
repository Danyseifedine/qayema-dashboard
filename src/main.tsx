// First: before any schema is made (it sets how zod builds them).
import '@/config/zod'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/styles/globals.css'
import App from '@/App'
import { reloadOnNewRelease } from '@/app/new-release'
import { AppProviders } from '@/app/providers/app-providers'
import { installErrorReporting } from '@/lib/api/report-error'
import { languageReady } from '@/lib/i18n'
import { ErrorBoundary } from '@/shared/components/feedback'

reloadOnNewRelease()
installErrorReporting()

// The owner's language first (it downloads unless it is English), so the
// first paint is never in the wrong one.
void languageReady().then(() =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AppProviders>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </AppProviders>
    </StrictMode>,
  ),
)
