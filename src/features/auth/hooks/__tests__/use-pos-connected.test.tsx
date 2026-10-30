import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import MockAdapter from 'axios-mock-adapter'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { api } from '@/lib/api/client'
import { usePosConnected } from '@/features/auth/hooks/use-pos-connected'
import { makeSessionUser } from '@/test/factories/session'

let mock: MockAdapter

function wrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('usePosConnected', () => {
  beforeEach(() => {
    mock = new MockAdapter(api)
  })

  afterEach(() => mock.restore())

  it('follows the session once it arrives', async () => {
    mock.onGet('/api/user').reply(200, { data: makeSessionUser({ pos_connected: true }) })
    const { result } = renderHook(() => usePosConnected(), { wrapper: wrapper() })

    expect(result.current).toBe(false)
    await waitFor(() => expect(result.current).toBe(true))
  })

  it('is false for a server from before it', async () => {
    const user = makeSessionUser()
    const { pos_connected: _gone, ...restaurant } = user.restaurant!
    mock.onGet('/api/user').reply(200, { data: { ...user, restaurant } })
    const { result } = renderHook(() => usePosConnected(), { wrapper: wrapper() })

    await waitFor(() => expect(mock.history.get).toHaveLength(1))
    expect(result.current).toBe(false)
  })
})
