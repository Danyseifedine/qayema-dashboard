import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import MockAdapter from 'axios-mock-adapter'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { api } from '@/lib/api/client'
import type { Plan } from '@/features/auth/schemas/user.schema'
import { useTurnedOff } from '@/features/auth/hooks/use-turned-off'
import { makeSessionUser } from '@/test/factories/session'

let mock: MockAdapter

function render(flag: keyof Plan) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return renderHook(() => useTurnedOff(flag), { wrapper })
}

describe('useTurnedOff', () => {
  beforeEach(() => {
    mock = new MockAdapter(api)
  })

  afterEach(() => mock.restore())

  it('is true for a flag the admin turned off, false for the rest', async () => {
    mock.onGet('/api/user').reply(200, { data: makeSessionUser({ turned_off: ['ordering'] }) })
    const ordering = render('ordering')
    const analytics = render('analytics')

    await waitFor(() => expect(ordering.result.current).toBe(true))
    await waitFor(() => expect(mock.history.get).toHaveLength(2))
    expect(analytics.result.current).toBe(false)
  })

  it('is false before the session arrives and for an owner with no restaurant yet', async () => {
    mock.onGet('/api/user').reply(200, { data: { ...makeSessionUser(), restaurant: null } })
    const { result } = render('ordering')

    expect(result.current).toBe(false)
    await waitFor(() => expect(mock.history.get).toHaveLength(1))
    expect(result.current).toBe(false)
  })
})
