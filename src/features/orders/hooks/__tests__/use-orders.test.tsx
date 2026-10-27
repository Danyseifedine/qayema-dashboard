import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import MockAdapter from 'axios-mock-adapter'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { orderKeys } from '@/features/orders/hooks/order-keys'
import {
  useDeleteOrder,
  useEditOrder,
  useOrders,
  useSetOrderStatus,
} from '@/features/orders/hooks/use-orders'
import type { Order } from '@/features/orders/schemas/order.schema'

let mock: MockAdapter

function order(id: number, overrides: Partial<Order> = {}): Order {
  return {
    id,
    reference: `REF${id}`,
    status: 'placed',
    currency: 'USD',
    total: '10.00',
    exchange_rate: null,
    note: null,
    fulfilment: 'pickup',
    table: null,
    name: null,
    phone: null,
    address: null,
    map_url: null,
    placed_at: '2026-10-19T10:00:00+00:00',
    accepted_at: null,
    guest_updated_at: null,
    guest_updates: 0,
    owner_updated_at: null,
    items: [],
    ...overrides,
  }
}

/** A page of the list as the API sends it: 30 to a page in real life. */
function page(ids: number[], current: number, last: number, open = 1) {
  return {
    data: ids.map((id) => order(id)),
    links: { next: current < last ? `/api/orders?page=${current + 1}` : null },
    meta: { open, current_page: current, last_page: last, per_page: 30, total: 99 },
  }
}

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
  /** The keys invalidated so far, in order. */
  const invalidated = () => invalidate.mock.calls.map(([filters]) => filters?.queryKey)
  return { queryClient, wrapper, invalidated }
}

describe('useOrders', () => {
  beforeEach(() => {
    mock = new MockAdapter(api)
  })

  afterEach(() => {
    mock.restore()
  })

  it('lists the newest page first, then adds the next one when asked', async () => {
    mock.onGet('/api/orders', { params: { kind: 'away' } }).reply(200, page([3, 2], 1, 2, 4))
    mock.onGet('/api/orders', { params: { kind: 'away', page: 2 } }).reply(200, page([1], 2, 2, 3))
    const { wrapper } = setup()

    const { result } = renderHook(() => useOrders('away', null), { wrapper })

    await waitFor(() => expect(result.current.data?.orders.map((o) => o.id)).toEqual([3, 2]))
    expect(result.current.data?.open).toBe(4)
    expect(result.current.hasNextPage).toBe(true)

    await act(() => result.current.fetchNextPage())

    await waitFor(() => expect(result.current.data?.orders.map((o) => o.id)).toEqual([3, 2, 1]))
    // The page asked for last has the freshest count.
    expect(result.current.data?.open).toBe(3)
    expect(result.current.hasNextPage).toBe(false)
  })

  it('shows an order once when a new one pushed it onto the next page', async () => {
    mock
      .onGet('/api/orders', { params: { kind: 'table', status: 'placed' } })
      .reply(200, page([3, 2], 1, 2))
    mock
      .onGet('/api/orders', { params: { kind: 'table', status: 'placed', page: 2 } })
      .reply(200, page([2, 1], 2, 2))
    const { wrapper } = setup()

    const { result } = renderHook(() => useOrders('table', 'placed'), { wrapper })
    await waitFor(() => expect(result.current.hasNextPage).toBe(true))
    await act(() => result.current.fetchNextPage())

    await waitFor(() => expect(result.current.data?.orders.map((o) => o.id)).toEqual([3, 2, 1]))
  })

  it('reads an answer without page numbers as the only page', async () => {
    mock.onGet('/api/orders').reply(200, { data: [order(1)], meta: { open: 1 } })
    const { wrapper } = setup()

    const { result } = renderHook(() => useOrders('away', null), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.hasNextPage).toBe(false)
  })

  it('never polls on its own: the pulse refreshes it', async () => {
    mock.onGet('/api/orders').reply(200, page([1], 1, 1))
    const { wrapper, queryClient } = setup()

    renderHook(() => useOrders('away', null), { wrapper })

    await waitFor(() => expect(mock.history.get).toHaveLength(1))
    const options = queryClient.getQueryCache().find({ queryKey: orderKeys.list('away', null) })
      ?.observers[0]?.options
    expect(options?.refetchInterval).toBeUndefined()
  })
})

describe('order mutations', () => {
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

  it('a status move refreshes the lists and the counts waiting, never everything', async () => {
    mock.onPatch('/api/orders/1').reply(200, { data: order(1, { status: 'accepted' }) })
    const { wrapper, invalidated } = setup()

    const { result } = renderHook(() => useSetOrderStatus(), { wrapper })
    await act(() => result.current.mutateAsync({ id: 1, status: 'accepted', guestUpdates: 0 }))

    expect(invalidated()).toEqual([orderKeys.lists(), orderKeys.pulse()])
  })

  it('a refused move refreshes only the lists', async () => {
    mock.onPatch('/api/orders/1').reply(409, { message: 'Moved on', code: 'order_moved_on' })
    const { wrapper, invalidated } = setup()

    const { result } = renderHook(() => useSetOrderStatus(), { wrapper })
    act(() => result.current.mutate({ id: 1, status: 'ready' }))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(invalidated()).toEqual([orderKeys.lists()])
  })

  it('an edit refreshes the lists, and the counts only when it accepted a new order', async () => {
    mock.onPut('/api/orders/1/items').reply(200, { data: order(1, { status: 'accepted' }) })
    const { wrapper, invalidated } = setup()

    const { result } = renderHook(() => useEditOrder(), { wrapper })
    await act(() => result.current.mutateAsync({ id: 1, edit: { items: [], add: [] } }))
    expect(invalidated()).toEqual([orderKeys.lists()])

    await act(() =>
      result.current.mutateAsync({ id: 1, edit: { items: [], add: [], guest_updates: 0 } }),
    )
    expect(invalidated()).toEqual([orderKeys.lists(), orderKeys.lists(), orderKeys.pulse()])
  })

  it('a refused edit refreshes only the lists', async () => {
    mock.onPut('/api/orders/1/items').reply(409, { message: 'Closed', code: 'order_closed' })
    const { wrapper, invalidated } = setup()

    const { result } = renderHook(() => useEditOrder(), { wrapper })
    act(() => result.current.mutate({ id: 1, edit: { items: [], add: [] } }))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(invalidated()).toEqual([orderKeys.lists()])
  })

  it('a delete refreshes the lists, and the counts only for a new order', async () => {
    mock.onDelete(/\/api\/orders\/\d+/).reply(204)
    const { wrapper, invalidated } = setup()

    const { result } = renderHook(() => useDeleteOrder(), { wrapper })
    await act(() => result.current.mutateAsync(order(1, { status: 'done' })))
    expect(invalidated()).toEqual([orderKeys.lists()])

    await act(() => result.current.mutateAsync(order(2)))
    expect(invalidated()).toEqual([orderKeys.lists(), orderKeys.lists(), orderKeys.pulse()])
  })
})
