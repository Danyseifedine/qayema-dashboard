import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const made = vi.hoisted(() => ({ options: null as Record<string, unknown> | null }))

vi.mock('laravel-echo', () => ({
  default: class {
    connector = {}
    constructor(options: Record<string, unknown>) {
      made.options = options
    }
  },
}))

describe('realtime', () => {
  beforeEach(() => {
    vi.resetModules()
    made.options = null
  })

  afterEach(() => {
    vi.doUnmock('@/config/env')
    vi.doUnmock('pusher-js')
  })

  it('is off without a Pusher key, and the caller checks on a timer', async () => {
    vi.doMock('@/config/env', () => ({
      env: {
        VITE_API_URL: 'https://qayema.test',
        VITE_PUSHER_KEY: undefined,
        VITE_PUSHER_CLUSTER: 'eu',
      },
    }))
    const { realtime } = await import('@/lib/realtime/echo')

    expect(await realtime()).toBeNull()
    expect(made.options).toBeNull()
  })

  it('connects once, and has private channels signed by the app with the session', async () => {
    vi.doMock('@/config/env', () => ({
      env: {
        VITE_API_URL: 'https://qayema.test',
        VITE_PUSHER_KEY: 'public-key',
        VITE_PUSHER_CLUSTER: 'eu',
      },
    }))
    const { realtime } = await import('@/lib/realtime/echo')
    const { api } = await import('@/lib/api/client')
    const mock = new MockAdapter(api)
    mock.onPost('/api/broadcasting/auth').replyOnce(200, { auth: 'key:signature' })
    mock.onPost('/api/broadcasting/auth').replyOnce(403, { message: 'Forbidden' })

    const echo = await realtime()
    expect(await realtime()).toBe(echo)
    expect(made.options).toMatchObject({
      broadcaster: 'pusher',
      key: 'public-key',
      cluster: 'eu',
      forceTLS: true,
    })

    const authorize = (
      made.options!.channelAuthorization as {
        customHandler: (
          params: { socketId: string; channelName: string },
          callback: (error: Error | null, data: unknown) => void,
        ) => void
      }
    ).customHandler
    const signed = await new Promise<unknown[]>((resolve) =>
      authorize({ socketId: '1.2', channelName: 'private-orders.7' }, (...args) => resolve(args)),
    )
    expect(signed).toEqual([null, { auth: 'key:signature' }])
    expect(JSON.parse(mock.history.post[0]!.data as string)).toEqual({
      socket_id: '1.2',
      channel_name: 'private-orders.7',
    })

    const refused = await new Promise<unknown[]>((resolve) =>
      authorize({ socketId: '1.2', channelName: 'private-orders.8' }, (...args) => resolve(args)),
    )
    expect(refused[0]).toBeInstanceOf(Error)
    expect(refused[1]).toBeNull()
    mock.restore()
  })

  it('is off while the library cannot be downloaded, and tries again on the next ask', async () => {
    vi.doMock('@/config/env', () => ({
      env: {
        VITE_API_URL: 'https://qayema.test',
        VITE_PUSHER_KEY: 'public-key',
        VITE_PUSHER_CLUSTER: 'eu',
      },
    }))
    // The first download fails, as on a network that drops; the next one works.
    let downloads = 0
    vi.doMock('pusher-js', () => {
      downloads += 1
      if (downloads === 1) throw new Error('Failed to fetch dynamically imported module')
      return { default: vi.fn() }
    })
    const { realtime } = await import('@/lib/realtime/echo')

    expect(await realtime()).toBeNull()
    expect(made.options).toBeNull()

    const echo = await realtime()
    expect(echo).not.toBeNull()
    expect(made.options).toMatchObject({ key: 'public-key', cluster: 'eu' })
    expect(downloads).toBe(2)
    // Connected now, and remembered.
    expect(await realtime()).toBe(echo)
  })
})
