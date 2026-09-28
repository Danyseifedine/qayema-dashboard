import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import MockAdapter from 'axios-mock-adapter'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { appearanceKeys } from '@/features/appearance/hooks/appearance-keys'
import { useSaveFont } from '@/features/appearance/hooks/use-appearance'

let mock: MockAdapter

const PAGE = {
  design: { id: 1, name: { en: 'Classic', ar: null } },
  settings: [],
  fonts: [],
}

describe('useSaveFont', () => {
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

  it('saves even when the page is not in the cache yet, and caches the answer', async () => {
    mock.onPut('/api/appearance').reply(200, { data: PAGE })
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useSaveFont(), { wrapper })
    result.current.mutate({ script: 'latin', family: 'Lora' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryClient.getQueryData(appearanceKeys.all)).toEqual(PAGE)
    expect(JSON.parse(mock.history.put[0]!.data as string)).toEqual({ fonts: { latin: 'Lora' } })
  })
})
