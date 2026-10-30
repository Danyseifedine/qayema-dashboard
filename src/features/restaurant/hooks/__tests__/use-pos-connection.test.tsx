import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import MockAdapter from 'axios-mock-adapter'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import type { PosConnection } from '@/features/restaurant/api/pos-connection.api'
import {
  POS_WATCH_MS,
  pullFinished,
  usePosConnection,
} from '@/features/restaurant/hooks/use-pos-connection'

let mock: MockAdapter

const BEFORE = { last_synced_at: 'a', last_attempt_at: 'a', last_error: null }

function connection(overrides: Partial<PosConnection> = {}): PosConnection {
  return {
    address: 'https://pos.example.com',
    company: null,
    branch: null,
    currency: 'USD',
    locales: ['en'],
    linked_at: null,
    ...BEFORE,
    unreachable_since: null,
    sends_orders: false,
    orders_in_menu: true,
    problems: [],
    ...overrides,
  }
}

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { ...renderHook(() => usePosConnection(), { wrapper }), invalidate }
}

describe('pullFinished', () => {
  it('waits for a new sync, or a new failure', () => {
    expect(pullFinished(undefined, BEFORE)).toBe(false)
    expect(pullFinished(null, BEFORE)).toBe(false)
    expect(pullFinished(connection(), BEFORE)).toBe(false)
    expect(pullFinished(connection({ last_synced_at: 'b' }), BEFORE)).toBe(true)
    // Started, not done yet.
    expect(pullFinished(connection({ last_attempt_at: 'b' }), BEFORE)).toBe(false)
    expect(
      pullFinished(connection({ last_attempt_at: 'b', last_error: 'No answer' }), BEFORE),
    ).toBe(true)
    // The same error as before is the old one.
    expect(
      pullFinished(connection({ last_attempt_at: 'b', last_error: 'x' }), {
        ...BEFORE,
        last_error: 'x',
      }),
    ).toBe(false)
  })
})

describe('usePosConnection', () => {
  beforeEach(() => {
    mock = new MockAdapter(api)
    resetCsrfToken(api)
    installCsrfInterceptor(api)
    mock.onGet('/api/csrf-token').reply(200, { token: 'csrf' })
  })

  afterEach(() => {
    vi.useRealTimers()
    mock.restore()
    api.interceptors.request.clear()
    api.interceptors.response.clear()
    resetCsrfToken(api)
  })

  it('stops waiting once the pull is done, and fetches the menu again', async () => {
    let answers = 0
    mock.onGet('/api/pos-connection').reply(() => {
      answers += 1
      return [200, { data: connection(answers > 2 ? { last_synced_at: 'b' } : {}) }]
    })
    mock.onPost('/api/pos-connection/sync').reply(202)
    const { result, invalidate } = setup()
    await waitFor(() => expect(result.current.query.data).toBeTruthy())

    act(() => result.current.sync.mutate())
    await waitFor(() => expect(result.current.syncing).toBe(true))
    await waitFor(() => expect(result.current.syncing).toBe(false), { timeout: 8000 })

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['dishes'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['categories'] })
  }, 10_000)

  it('gives up waiting after a while', async () => {
    mock.onGet('/api/pos-connection').reply(200, { data: connection() })
    mock.onPost('/api/pos-connection/sync').reply(202)
    const { result } = setup()
    await waitFor(() => expect(result.current.query.data).toBeTruthy())

    vi.useFakeTimers({ shouldAdvanceTime: true })
    act(() => result.current.sync.mutate())
    await waitFor(() => expect(result.current.syncing).toBe(true))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(POS_WATCH_MS + 100)
    })
    expect(result.current.syncing).toBe(false)
  })

  it('waits from nothing when syncing before the link was read', async () => {
    mock.onGet('/api/pos-connection').reply(() => new Promise(() => {}))
    mock.onPost('/api/pos-connection/sync').reply(202)
    const { result } = setup()

    act(() => result.current.sync.mutate())
    await waitFor(() => expect(result.current.syncing).toBe(true))
  })

  it('says when syncing or linking fails', async () => {
    mock.onGet('/api/pos-connection').reply(200, { data: null })
    mock.onPost('/api/pos-connection/sync').reply(500, { message: 'Server error.' })
    mock.onPost('/api/pos-connection').reply(500, { message: 'Server error.' })
    const { result } = setup()

    act(() => result.current.sync.mutate())
    await waitFor(() => expect(result.current.sync.isError).toBe(true))
    act(() => result.current.link.mutate({ address: 'x', key: 'y' }))
    await waitFor(() => expect(result.current.link.isError).toBe(true))
    expect(result.current.syncing).toBe(false)
  })

  it('switches sending orders off and keeps what the server answered', async () => {
    mock.onGet('/api/pos-connection').reply(200, { data: connection({ sends_orders: true }) })
    mock.onPatch('/api/pos-connection').reply(200, { data: connection({ sends_orders: false }) })
    const { result } = setup()
    await waitFor(() => expect(result.current.query.data?.sends_orders).toBe(true))

    act(() => result.current.sendOrders.mutate(false))

    await waitFor(() => expect(result.current.sendOrders.isSuccess).toBe(true))
    expect(result.current.query.data?.sends_orders).toBe(false)
  })

  it('leaves no link behind when sending fails before the link was read', async () => {
    mock.onGet('/api/pos-connection').reply(() => new Promise(() => {}))
    mock.onPatch('/api/pos-connection').reply(500, { message: 'Server error.' })
    const { result } = setup()

    act(() => result.current.sendOrders.mutate(true))

    await waitFor(() => expect(result.current.sendOrders.isError).toBe(true))
    expect(result.current.query.data ?? null).toBeNull()
  })
})
