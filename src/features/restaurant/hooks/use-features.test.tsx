import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import MockAdapter from 'axios-mock-adapter'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { sessionKeys } from '@/features/auth'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { makeSessionUser } from '@/test/mocks/factories/session'
import { useSaveSwitchedOff } from '@/features/restaurant/hooks/use-features'
import { useSaveMenuLanguages } from '@/features/restaurant/hooks/use-menu-languages-save'

let mock: MockAdapter

/** A cache holding an owner who has no restaurant yet. */
function withoutRestaurant() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const user = { ...makeSessionUser(), restaurant: null }
  queryClient.setQueryData(sessionKeys.current(), user)
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { queryClient, user, wrapper }
}

describe('restaurant save hooks on a session without a restaurant', () => {
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
  })

  it('leaves the session alone when switching a feature', async () => {
    mock.onPut('/api/features').reply(200, { data: { off: ['orders'] } })
    const { queryClient, user, wrapper } = withoutRestaurant()

    const { result } = renderHook(() => useSaveSwitchedOff(), { wrapper })
    result.current.mutate(['orders'])

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryClient.getQueryData(sessionKeys.current())).toEqual(user)
  })

  it('leaves the session alone when saving the languages', async () => {
    mock.onPut('/api/menu-languages').reply(200, {
      data: { languages: ['en', 'fr'], second_locale: 'fr', default_locale: 'en' },
    })
    const { queryClient, user, wrapper } = withoutRestaurant()

    const { result } = renderHook(() => useSaveMenuLanguages(), { wrapper })
    result.current.mutate({ second_locale: 'fr', default_locale: 'en' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryClient.getQueryData(sessionKeys.current())).toEqual(user)
  })
})
