import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import MockAdapter from 'axios-mock-adapter'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { safeRedirect } from '@/lib/security/safe-redirect'
import { useLogout } from '@/features/auth/hooks/use-logout'
import { sessionKeys } from '@/features/auth/hooks/session-keys'
import { makeSessionUser } from '@/test/factories/session'

vi.mock('@/lib/security/safe-redirect', () => ({ safeRedirect: vi.fn(() => true) }))

let mock: MockAdapter

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  queryClient.setQueryData(sessionKeys.current(), makeSessionUser())
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { queryClient, ...renderHook(() => useLogout(), { wrapper }) }
}

describe('useLogout', () => {
  beforeEach(() => {
    mock = new MockAdapter(api)
    resetCsrfToken(api)
    installCsrfInterceptor(api)
    mock.onGet('/api/csrf-token').reply(200, { token: 'csrf' })
  })

  afterEach(() => {
    mock.restore()
    api.interceptors.request.clear()
    api.interceptors.response.clear()
    resetCsrfToken(api)
    vi.mocked(safeRedirect).mockClear()
  })

  it('ends the session, forgets the cache, then leaves for the login page', async () => {
    mock.onPost('/api/logout').reply(204)
    const { result, queryClient } = setup()

    act(() => result.current.mutate())

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mock.history.post[0]!.headers?.['X-CSRF-TOKEN']).toBe('csrf')
    expect(queryClient.getQueryData(sessionKeys.current())).toBeUndefined()
    expect(safeRedirect).toHaveBeenCalledWith('https://qayema.test/get-started')
  })

  it('stays, signed in, when the server did not end the session', async () => {
    mock.onPost('/api/logout').reply(500, { message: 'Try later' })
    const { result, queryClient } = setup()

    act(() => result.current.mutate())

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Try later')
    expect(queryClient.getQueryData(sessionKeys.current())).toBeDefined()
    expect(safeRedirect).not.toHaveBeenCalled()
  })
})
