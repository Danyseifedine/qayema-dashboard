import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/** A fresh copy of the module: what was already sent is per page load. */
async function freshReporter() {
  vi.resetModules()
  return import('@/lib/api/report-error')
}

type Sent = { message: string; stack: string | null; source: string; page: string; release: string }

let fetchMock: ReturnType<typeof vi.fn>

function sent(): Sent[] {
  return fetchMock.mock.calls.map(([, init]) => JSON.parse((init as RequestInit).body as string))
}

describe('reportError', () => {
  beforeEach(() => {
    fetchMock = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })))
    vi.stubGlobal('fetch', fetchMock)
    window.history.replaceState(null, '', '/dishes')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    document.head.innerHTML = ''
    window.history.replaceState(null, '', '/')
  })

  it('sends the error to the backend, without cookies, and survives the page closing', async () => {
    const { reportError } = await freshReporter()

    reportError(new TypeError('dish.name is undefined'), 'render', 'in DishCard')

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://qayema.test/api/client-errors')
    expect(init).toMatchObject({ method: 'POST', keepalive: true, credentials: 'omit' })
    expect(sent()[0]).toMatchObject({
      message: 'TypeError: dish.name is undefined',
      source: 'render',
      page: '/dishes',
      release: 'dev',
    })
    expect(sent()[0]!.stack).toContain('in DishCard')
  })

  it('names the release from the build entry, and reports what is not an Error', async () => {
    document.head.innerHTML = '<script type="module" src="/assets/index-B2-GTCz_.js"></script>'
    const { reportError } = await freshReporter()

    reportError('plain words', 'rejection')

    expect(sent()[0]).toMatchObject({ message: 'plain words', stack: null, release: 'B2-GTCz_' })
  })

  it('sends one report per error, five at most, and keeps them short', async () => {
    const { reportError } = await freshReporter()

    reportError(new Error('again'), 'error')
    reportError(new Error('again'), 'error')
    for (let index = 0; index < 10; index++) reportError(new Error(`n${index}`), 'error')
    expect(fetchMock).toHaveBeenCalledTimes(5)

    const long = await freshReporter()
    fetchMock.mockClear()
    const error = new Error('x'.repeat(3000))
    error.stack = 'y'.repeat(9000)
    long.reportError(error, 'error')
    expect(sent()[0]!.message).toHaveLength(1000)
    expect(sent()[0]!.stack).toHaveLength(4000)
  })

  it('drops a report the network refuses', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const { reportError } = await freshReporter()

    expect(() => reportError(new Error('offline'), 'error')).not.toThrow()
    await Promise.resolve()
  })
})

describe('installErrorReporting', () => {
  beforeEach(() => {
    fetchMock = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })))
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function fakeWindow(): Window {
    const target = new EventTarget() as unknown as Window
    Object.assign(target, { location: { origin: 'https://dashboard.qayema.com' } })
    return target
  }

  it('reports script errors from the dashboard and rejected promises', async () => {
    const { installErrorReporting } = await freshReporter()
    const target = fakeWindow()
    installErrorReporting(target)

    target.dispatchEvent(
      new ErrorEvent('error', {
        error: new RangeError('bad index'),
        filename: 'https://dashboard.qayema.com/assets/index-B2-GTCz_.js',
      }),
    )
    target.dispatchEvent(new ErrorEvent('error', { message: 'Script error.' }))
    const rejection = new Event('unhandledrejection') as PromiseRejectionEvent
    Object.assign(rejection, { reason: new Error('nobody caught me') })
    target.dispatchEvent(rejection)

    expect(sent().map(({ message, source }) => [message, source])).toEqual([
      ['RangeError: bad index', 'error'],
      ['Script error.', 'error'],
      ['Error: nobody caught me', 'rejection'],
    ])
  })

  it("leaves another site's script alone (a browser extension)", async () => {
    const { installErrorReporting } = await freshReporter()
    const target = fakeWindow()
    installErrorReporting(target)

    target.dispatchEvent(
      new ErrorEvent('error', {
        error: new Error('not ours'),
        filename: 'chrome-extension://abc/content.js',
      }),
    )

    expect(fetchMock).not.toHaveBeenCalled()
  })
})
