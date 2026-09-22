import { useEffect, type ReactNode } from 'react'
import { configureApi } from '@/lib/api'
import { QueryProvider } from './query-provider'
import { ToastProvider } from './toast-provider'

/**
 * Everything the app needs in scope before a screen renders. Kept to
 * composition only: no data fetching, no layout.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  // Interceptors are installed once, before the first request goes out.
  useEffect(() => {
    configureApi()
  }, [])

  return (
    <QueryProvider>
      {children}
      <ToastProvider />
    </QueryProvider>
  )
}
