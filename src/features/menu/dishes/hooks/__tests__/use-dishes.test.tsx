import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import MockAdapter from 'axios-mock-adapter'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sessionKeys } from '@/features/auth'
import { offerKeys } from '@/features/offers'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { makeDish, resetFactories } from '@/test/factories/menu'
import { dishKeys } from '@/features/menu/dishes/hooks/dish-keys'
import type { DishPayload } from '@/features/menu/dishes/api/dish.api'
import {
  useDeleteDish,
  useDishAvailability,
  useReorderDishes,
  useSaveDish,
} from '@/features/menu/dishes/hooks/use-dishes'

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

  // Home's checklist reads the dishes without a photo from the session.
  it('refreshes the session when a dish or its photo comes or goes', async () => {
    const payload: DishPayload = {
      name: { en: 'Kafta' },
      ingredients: { en: '' },
      price: 9,
      category_id: 1,
      is_available: true,
    }
    mock.onPost('/api/dishes').reply(201, { data: makeDish({ id: 5 }) })
    mock.onPatch('/api/dishes/5').reply(200, { data: makeDish({ id: 5 }) })
    mock.onDelete('/api/dishes/5').reply(204)
    const { queryClient, wrapper } = setup()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const session = JSON.stringify(sessionKeys.current())
    const refreshedSession = () =>
      invalidate.mock.calls.filter(([filters]) => JSON.stringify(filters?.queryKey) === session)
        .length

    const created = renderHook(() => useSaveDish(null), { wrapper })
    await act(() => created.result.current.mutateAsync(payload))
    expect(refreshedSession()).toBe(1)

    const edited = renderHook(() => useSaveDish(5), { wrapper })
    await act(() => edited.result.current.mutateAsync(payload))
    expect(refreshedSession()).toBe(1)
    await act(() => edited.result.current.mutateAsync({ ...payload, image_key: 'tmp/a.webp' }))
    expect(refreshedSession()).toBe(2)
    await act(() => edited.result.current.mutateAsync({ ...payload, delete_image: true }))
    expect(refreshedSession()).toBe(3)

    const removed = renderHook(() => useDeleteDish(), { wrapper })
    await act(() => removed.result.current.mutateAsync(5))
    expect(refreshedSession()).toBe(4)
  })

  it('refreshes the offers when a deal dish is saved or deleted, and only then', async () => {
    const payload: DishPayload = {
      name: { en: 'Family meal' },
      ingredients: { en: '' },
      price: 25,
      category_id: 1,
      is_available: true,
    }
    const offer = { id: 3, title: { en: 'Pizza night' }, status: 'live' as const, next_start: null }
    mock.onPatch('/api/dishes/40').reply(200, { data: makeDish({ id: 40, offer }) })
    mock.onPatch('/api/dishes/5').reply(200, { data: makeDish({ id: 5 }) })
    mock.onDelete('/api/dishes/40').reply(204)
    mock.onDelete('/api/dishes/5').reply(204)
    const { queryClient, wrapper } = setup()
    queryClient.setQueryData(dishKeys.list(), {
      data: [makeDish({ id: 40, offer }), makeDish({ id: 5 })],
      meta: { used: 2, limit: null, currency: 'USD', second_currency: null, exchange_rate: null },
    })
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const offers = JSON.stringify(offerKeys.all)
    const refreshedOffers = () =>
      invalidate.mock.calls.filter(([filters]) => JSON.stringify(filters?.queryKey) === offers)
        .length

    const own = renderHook(() => useSaveDish(5), { wrapper })
    await act(() => own.result.current.mutateAsync(payload))
    expect(refreshedOffers()).toBe(0)
    const deal = renderHook(() => useSaveDish(40), { wrapper })
    await act(() => deal.result.current.mutateAsync(payload))
    expect(refreshedOffers()).toBe(1)

    const removed = renderHook(() => useDeleteDish(), { wrapper })
    await act(() => removed.result.current.mutateAsync(5))
    expect(refreshedOffers()).toBe(1)
    await act(() => removed.result.current.mutateAsync(40))
    expect(refreshedOffers()).toBe(2)
  })
})
