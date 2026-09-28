import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import MockAdapter from 'axios-mock-adapter'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { api } from '@/lib/api/client'
import { useMenuLanguages } from '@/features/auth/hooks/use-menu-languages'
import { makeSessionUser } from '@/test/mocks/factories/session'

let mock: MockAdapter

function render() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return renderHook(() => useMenuLanguages(), { wrapper })
}

describe('useMenuLanguages', () => {
  beforeEach(() => {
    mock = new MockAdapter(api)
  })

  afterEach(() => mock.restore())

  it("follows the restaurant's languages", async () => {
    mock.onGet('/api/user').reply(200, { data: makeSessionUser({ languages: ['en', 'fr'] }) })
    const { result } = render()

    // English alone until the session arrives.
    expect(result.current).toEqual(['en'])
    await waitFor(() => expect(result.current).toEqual(['en', 'fr']))
  })

  it('is English alone without a restaurant', async () => {
    mock.onGet('/api/user').reply(200, { data: { ...makeSessionUser(), restaurant: null } })
    const { result } = render()

    await waitFor(() => expect(mock.history.get).toHaveLength(1))
    expect(result.current).toEqual(['en'])
  })
})
