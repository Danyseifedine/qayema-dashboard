import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, screen, waitFor } from '@testing-library/react'
import MockAdapter from 'axios-mock-adapter'
import type { ReactNode } from 'react'
import { Toaster } from 'sonner'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { orderKeys } from '@/features/orders/hooks/order-keys'
import { realtime } from '@/lib/realtime/echo'
import { FALLBACK_INTERVAL, useOrderPulse } from '@/features/orders/hooks/use-order-pulse'

vi.mock('@/lib/realtime/echo', () => ({ realtime: vi.fn(async () => null) }))

/**
 * Pusher as Echo hands it over: a private channel and a connection. The
 * channel is joined at once (`joined`), unless the test says otherwise.
 */
function fakeEcho(state = 'connected', joined = true) {
  const handlers: Record<string, (payload: unknown) => void> = {}
  const stateHandlers: ((states: { current: string }) => void)[] = []
  const joins: (() => void)[] = []
  const refusals: (() => void)[] = []
  const channel = {
    listen: (event: string, handler: (payload: unknown) => void) => {
      handlers[event] = handler
      return channel
    },
    subscribed: (handler: () => void) => {
      joins.push(handler)
      if (joined) handler()
      return channel
    },
    error: (handler: () => void) => {
      refusals.push(handler)
      return channel
    },
  }
  const echo = {
    private: vi.fn(() => channel),
    leave: vi.fn(),
    connector: {
      pusher: {
        connection: {
          state,
          bind: (_event: string, handler: (states: { current: string }) => void) =>
            stateHandlers.push(handler),
          unbind: vi.fn(),
        },
      },
    },
  }
  vi.mocked(realtime).mockResolvedValue(echo as never)
  return {
    echo,
    send: (payload: unknown) => handlers['.orders.changed']!(payload),
    become: (current: string) => stateHandlers.forEach((handler) => handler({ current })),
    join: () => joins.forEach((handler) => handler()),
    refuse: () => refusals.forEach((handler) => handler()),
  }
}

/** How often the pulse is asked for right now: false while Pusher is heard. */
function interval(queryClient: QueryClient) {
  return queryClient.getQueryCache().find({ queryKey: orderKeys.pulse() })?.observers[0]?.options
    .refetchInterval
}

let mock: MockAdapter
let play: ReturnType<typeof vi.spyOn>

function setup(enabled = true) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  )
  // The Orders page's count; orders to a table have a test of their own.
  const hook = renderHook(({ on }: { on: boolean }) => useOrderPulse(on, 7).orders, {
    wrapper,
    initialProps: { on: enabled },
  })
  return {
    ...hook,
    queryClient,
    poll: () => queryClient.refetchQueries({ queryKey: orderKeys.pulse() }),
  }
}

function answer(open: number, latest: number | null, changed: string | null = null) {
  mock.onGet('/api/orders/pulse').reply(200, { data: { open, latest, changed } })
}

describe('useOrderPulse', () => {
  beforeEach(() => {
    vi.mocked(realtime).mockClear()
    mock = new MockAdapter(api)
    document.title = 'Qayema Dashboard'
    // jsdom has no audio; what matters is that the chime was asked for.
    play = vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
  })

  afterEach(() => {
    mock.restore()
    play.mockRestore()
    vi.mocked(realtime).mockResolvedValue(null)
  })

  it('says nothing about orders that were already there', async () => {
    answer(2, 40)
    const { result } = setup()

    await waitFor(() => expect(result.current).toBe(2))
    expect(play).not.toHaveBeenCalled()
    expect(document.title).toBe('(2) Qayema Dashboard')
  })

  it('counts orders to a table apart, and both in the tab title', async () => {
    mock
      .onGet('/api/orders/pulse')
      .reply(200, { data: { open: 1, table_open: 2, latest: 40, changed: null } })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useOrderPulse(true, 7), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    })

    await waitFor(() => expect(result.current).toEqual({ orders: 1, tables: 2 }))
    expect(document.title).toBe('(3) Qayema Dashboard')
  })

  it('chimes and says so when a new order arrives', async () => {
    answer(1, 40)
    const { result, poll, queryClient } = setup()
    await waitFor(() => expect(result.current).toBe(1))
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    answer(2, 41)
    await poll()

    await waitFor(() => expect(play).toHaveBeenCalledOnce())
    expect(await screen.findByText('New order')).toBeInTheDocument()
    expect(invalidate).toHaveBeenCalledWith({ queryKey: orderKeys.lists() })
    expect(document.title).toBe('(2) Qayema Dashboard')
  })

  it('chimes and says so when a guest changes an order', async () => {
    answer(1, 40, '2026-10-03T12:00:00+00:00')
    const { result, poll } = setup()
    await waitFor(() => expect(result.current).toBe(1))

    answer(1, 40, '2026-10-03T12:05:00+00:00')
    await poll()

    await waitFor(() => expect(play).toHaveBeenCalledOnce())
    expect(await screen.findByText('An order was changed')).toBeInTheDocument()
  })

  it('stays quiet when an order is only marked done', async () => {
    answer(2, 41)
    const { result, poll } = setup()
    await waitFor(() => expect(result.current).toBe(2))

    answer(1, 41)
    await poll()

    await waitFor(() => expect(result.current).toBe(1))
    expect(play).not.toHaveBeenCalled()
    expect(document.title).toBe('(1) Qayema Dashboard')
  })

  it('chimes for the very first order', async () => {
    answer(0, null)
    const { result, poll, queryClient } = setup()
    await waitFor(() =>
      expect(queryClient.getQueryData(orderKeys.pulse())).toEqual({
        open: 0,
        table_open: 0,
        latest: null,
        changed: null,
      }),
    )
    expect(result.current).toBe(0)
    expect(document.title).toBe('Qayema Dashboard')

    answer(1, 1)
    await poll()

    await waitFor(() => expect(play).toHaveBeenCalledOnce())
  })

  it('asks nothing while orders go to WhatsApp, and clears the title when switched off', async () => {
    answer(3, 50)
    const { result, rerender } = setup()
    await waitFor(() => expect(document.title).toBe('(3) Qayema Dashboard'))

    rerender({ on: false })

    expect(result.current).toBe(0)
    expect(document.title).toBe('Qayema Dashboard')
  })

  it('never polls when it starts switched off', () => {
    const { result } = setup(false)

    expect(result.current).toBe(0)
    expect(mock.history.get).toHaveLength(0)
  })

  describe('with Pusher', () => {
    it("listens on the restaurant's private channel and chimes the moment an order arrives", async () => {
      const pusher = fakeEcho()
      answer(1, 40)
      const { result, unmount } = setup()
      await waitFor(() => expect(result.current).toBe(1))
      expect(pusher.echo.private).toHaveBeenCalledWith('orders.7')

      act(() => pusher.send({ open: 2, latest: 41, changed: null }))

      await waitFor(() => expect(play).toHaveBeenCalledOnce())
      expect(result.current).toBe(2)
      // Heard live: nothing was asked for again.
      expect(mock.history.get).toHaveLength(1)

      unmount()
      expect(pusher.echo.leave).toHaveBeenCalledWith('orders.7')
    })

    it('asks again when the connection comes back, for what it missed', async () => {
      const pusher = fakeEcho('connecting')
      answer(1, 40)
      const { result } = setup()
      await waitFor(() => expect(result.current).toBe(1))

      answer(2, 41)
      act(() => pusher.become('connected'))

      await waitFor(() => expect(result.current).toBe(2))
      expect(play).toHaveBeenCalledOnce()
    })

    it('keeps checking every minute until the channel is joined, and again if it is refused', async () => {
      const pusher = fakeEcho('connected', false)
      answer(1, 40)
      const { result, queryClient } = setup()
      await waitFor(() => expect(result.current).toBe(1))
      await waitFor(() => expect(pusher.echo.private).toHaveBeenCalled())

      // Connected, but not yet let in: not heard.
      expect(interval(queryClient)).toBe(FALLBACK_INTERVAL)

      act(() => pusher.join())
      await waitFor(() => expect(interval(queryClient)).toBe(false))

      // The app refused the sign-in (an expired session): deaf again.
      act(() => pusher.refuse())
      await waitFor(() => expect(interval(queryClient)).toBe(FALLBACK_INTERVAL))
    })

    it('asks again rather than trusting a message that does not fit', async () => {
      const pusher = fakeEcho()
      answer(1, 40)
      const { result } = setup()
      await waitFor(() => expect(result.current).toBe(1))
      await waitFor(() => expect(pusher.echo.private).toHaveBeenCalled())

      answer(3, 42)
      act(() => pusher.send({ open: 'many' }))

      await waitFor(() => expect(result.current).toBe(3))
      expect(mock.history.get.filter((r) => r.url === '/api/orders/pulse')).toHaveLength(2)
    })

    it('does not listen while orders go to WhatsApp', async () => {
      const pusher = fakeEcho()
      setup(false)

      await act(async () => {})
      expect(realtime).not.toHaveBeenCalled()
      expect(pusher.echo.private).not.toHaveBeenCalled()
    })

    it('listens to nothing when the page is left before Pusher arrives', async () => {
      const pusher = fakeEcho()
      answer(1, 40)
      const { unmount } = setup()

      unmount()
      await act(async () => {})

      expect(pusher.echo.private).not.toHaveBeenCalled()
    })
  })
})
