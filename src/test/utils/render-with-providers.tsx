import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, type RenderOptions, type RenderResult } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { Toaster } from 'sonner'

/**
 * Renders inside a fresh QueryClient with retries off, so a deliberate error
 * case fails immediately instead of retrying through the test's timeout.
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
): RenderResult & { queryClient: QueryClient } {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  })

  // The real toaster is mounted so tests can assert on what the owner is
  // actually told, rather than on a spy.
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  )

  return { ...render(ui, { wrapper: Wrapper, ...options }), queryClient }
}
