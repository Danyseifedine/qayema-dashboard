import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import MockAdapter from 'axios-mock-adapter'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { offerKeys } from '@/features/offers/hooks/offer-keys'
import { useReorderOffers, useSetOfferActive } from '@/features/offers/hooks/use-offers'
import type { Offer } from '@/features/offers/schemas/offer.schema'

let mock: MockAdapter

const offer = (id: number): Offer => ({
  id,
  title: { en: `Offer ${id}` },
  description: { en: null },
  show_text: true,
  image_url: null,
  placements: ['banner'],
  banner_shape: 'rectangle',
  popup_shape: 'square',
  action: 'none',
  action_url: null,
  show_again: 'every_visit',
  delay_seconds: 0,
  ad_delay_seconds: 2,
  ad_seconds: 6,
  discount_type: 'none',
  discount_value: null,
  dish_ids: [],
  starts_at: null,
  ends_at: null,
  repeat: 'always',
  weekdays: [],
  month_days: [],
  time_windows: null,
  shows_outside_hours: false,
  is_active: true,
  status: 'live',
  next_start: null,
  kept_off: null,
  deal: null,
})

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { queryClient, wrapper }
}

/** Optimistic hooks run with no list loaded: they must not invent one, nor fail. */
describe('offer mutations with nothing cached', () => {
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

  it('pausing leaves an empty cache empty, on success and on failure', async () => {
    mock.onPatch('/api/offers/1/active').replyOnce(200, { data: { ...offer(1), is_active: false } })
    mock.onPatch('/api/offers/1/active').replyOnce(500, { message: 'Nope', code: 'server_error' })
    const { queryClient, wrapper } = setup()
    const { result } = renderHook(() => useSetOfferActive(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ id: 1, active: false })
    })
    await act(async () => {
      await result.current.mutateAsync({ id: 1, active: true }).catch(() => {})
    })

    expect(queryClient.getQueryData(offerKeys.list())).toBeUndefined()
  })

  it('pausing one offer changes only that one', async () => {
    mock
      .onPatch('/api/offers/2/active')
      .reply(200, { data: { ...offer(2), is_active: false, status: 'paused' } })
    const { queryClient, wrapper } = setup()
    queryClient.setQueryData(offerKeys.list(), {
      data: [offer(1), offer(2)],
      meta: { limit: 30, timezone: 'UTC', currency: 'USD', stats: {} },
    })
    const { result } = renderHook(() => useSetOfferActive(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ id: 2, active: false })
    })

    const list = queryClient.getQueryData<{ data: Offer[] }>(offerKeys.list())!
    expect(list.data.map((item) => item.status)).toEqual(['live', 'paused'])
  })

  it('reordering leaves an empty cache empty, on success and on failure', async () => {
    mock.onPost('/api/offers/reorder').replyOnce(200, { data: [offer(2), offer(1)] })
    mock.onPost('/api/offers/reorder').replyOnce(500, { message: 'Nope', code: 'server_error' })
    const { queryClient, wrapper } = setup()
    const { result } = renderHook(() => useReorderOffers(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync([offer(2), offer(1)])
    })
    await act(async () => {
      await result.current.mutateAsync([offer(1), offer(2)]).catch(() => {})
    })

    expect(queryClient.getQueryData(offerKeys.list())).toBeUndefined()
  })
})
