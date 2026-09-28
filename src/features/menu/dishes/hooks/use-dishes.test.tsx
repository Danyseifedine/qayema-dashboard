import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import MockAdapter from 'axios-mock-adapter'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { makeDish, resetFactories } from '@/test/factories/menu'
import { dishKeys } from '@/features/menu/dishes/hooks/dish-keys'
import { useDishAvailability, useReorderDishes } from '@/features/menu/dishes/hooks/use-dishes'

let mock: MockAdapter

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { queryClient, wrapper }
}

describe('dish mutations with nothing cached', () => {
  beforeEach(() => {
    resetFactories()
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

  // Both are only offered on a loaded grid, but neither may invent a cache
  // entry (with no usage block or currency) when there is none.
  it('reorder leaves an empty cache empty on success and on failure', async () => {
    const ordered = [makeDish({ id: 2 }), makeDish({ id: 1 })]
    mock
      .onPost('/api/dishes/reorder')
      .replyOnce(200, { data: ordered })
      .onPost('/api/dishes/reorder')
      .replyOnce(500, { message: 'Nope', code: 'server_error' })
    const { queryClient, wrapper } = setup()

    const { result } = renderHook(() => useReorderDishes(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync(ordered)
    })
    expect(JSON.parse(mock.history.post[0]!.data as string)).toEqual({ ids: [2, 1] })
    expect(queryClient.getQueryData(dishKeys.list())).toBeUndefined()

    act(() => result.current.mutate(ordered))
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(queryClient.getQueryData(dishKeys.list())).toBeUndefined()
  })

  it('availability leaves an empty cache empty on success and on failure', async () => {
    const dish = makeDish({ id: 5, is_available: false })
    mock
      .onPatch('/api/dishes/5/availability')
      .replyOnce(200, { data: dish })
      .onPatch('/api/dishes/5/availability')
      .replyOnce(500, { message: 'Nope', code: 'server_error' })
    const { queryClient, wrapper } = setup()

    const { result } = renderHook(() => useDishAvailability(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync({ id: 5, isAvailable: false })
    })
    expect(queryClient.getQueryData(dishKeys.list())).toBeUndefined()

    act(() => result.current.mutate({ id: 5, isAvailable: true }))
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(queryClient.getQueryData(dishKeys.list())).toBeUndefined()
  })
})
