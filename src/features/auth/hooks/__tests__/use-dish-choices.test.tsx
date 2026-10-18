import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import MockAdapter from 'axios-mock-adapter'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { api } from '@/lib/api/client'
import { useDishChoices } from '@/features/auth/hooks/use-dish-choices'
import { EMPTY_PLAN, FULL_PLAN, makeSessionUser } from '@/test/factories/session'

let mock: MockAdapter

function render() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return renderHook(() => useDishChoices(), { wrapper })
}

describe('useDishChoices', () => {
  beforeEach(() => {
    mock = new MockAdapter(api)
  })

  afterEach(() => mock.restore())

  it('is on when the package has them and the owner has not switched them off', async () => {
    mock.onGet('/api/user').reply(200, { data: makeSessionUser({ switched_off: ['addons'] }) })
    const { result } = render()

    // Off until the session says otherwise.
    expect(result.current).toEqual({ variants: false, addons: false })
    await waitFor(() => expect(result.current).toEqual({ variants: true, addons: false }))
  })

  it('is off on a package without them', async () => {
    mock.onGet('/api/user').reply(200, {
      data: makeSessionUser({ plan: { ...EMPTY_PLAN, addons: true } }),
    })
    const { result } = render()

    await waitFor(() => expect(result.current).toEqual({ variants: false, addons: true }))
  })

  it('keeps one answer between renders while nothing changes', async () => {
    mock.onGet('/api/user').reply(200, { data: makeSessionUser({ plan: FULL_PLAN }) })
    const { result, rerender } = render()
    await waitFor(() => expect(result.current.variants).toBe(true))

    const first = result.current
    rerender()
    expect(result.current).toBe(first)
  })
})
