import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import MockAdapter from 'axios-mock-adapter'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { makeCategory, resetFactories } from '@/test/mocks/factories/menu'
import { categoryKeys } from '@/features/menu/categories/hooks/category-keys'
import {
  useReorderCategories,
  useSaveCategory,
} from '@/features/menu/categories/hooks/use-categories'

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

describe('category mutations with nothing cached', () => {
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

  // Reorder is only offered on a loaded list, but the hook must not invent a
  // cache entry (with no usage block) when there is none.
  it('reorder leaves an empty cache empty on success', async () => {
    const ordered = [makeCategory({ id: 2 }), makeCategory({ id: 1 })]
    mock.onPost('/api/categories/reorder').reply(200, { data: ordered })
    const { queryClient, wrapper } = setup()

    const { result } = renderHook(() => useReorderCategories(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync(ordered)
    })

    expect(JSON.parse(mock.history.post[0]!.data as string)).toEqual({ ids: [2, 1] })
    expect(queryClient.getQueryData(categoryKeys.list())).toBeUndefined()
  })

  it('reorder has nothing to roll back on failure', async () => {
    mock.onPost('/api/categories/reorder').reply(500, { message: 'Nope', code: 'server_error' })
    const { queryClient, wrapper } = setup()

    const { result } = renderHook(() => useReorderCategories(), { wrapper })
    act(() => result.current.mutate([makeCategory({ id: 1 })]))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(queryClient.getQueryData(categoryKeys.list())).toBeUndefined()
  })

  it('save creates with POST when there is no id', async () => {
    mock.onPost('/api/categories').reply(201, { data: makeCategory({ id: 9 }) })
    const { wrapper } = setup()

    const { result } = renderHook(() => useSaveCategory(null), { wrapper })
    await act(async () => {
      await result.current.mutateAsync({ name: { en: 'Drinks' }, description: { en: '' } })
    })

    expect(mock.history.post.map((r) => r.url)).toContain('/api/categories')
    expect(mock.history.patch).toHaveLength(0)
  })
})
