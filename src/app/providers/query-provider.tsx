import { QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { createQueryClient } from '@/lib/query/client'

/**
 * Holds the cache in state so React's strict-mode double render, and hot
 * reloads in development, reuse one client instead of discarding the cache.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(createQueryClient)

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
