import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  checkUnanswered,
  noteAnswered,
  noteBlocked,
  resetUnanswered,
  useUnanswered,
} from '@/lib/api/unanswered'

describe('requests that got no answer', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('calls it blocked when the site still answers, offline when nothing does', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null)))
    expect(await checkUnanswered('/user')).toBe('blocked')

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    expect(await checkUnanswered('/user')).toBe('offline')
  })

  it('asks once for many requests failing together, the cheap way', async () => {
    const probe = vi.fn().mockResolvedValue(new Response(null))
    vi.stubGlobal('fetch', probe)

    await Promise.all([checkUnanswered('/user'), checkUnanswered('/restaurant')])

    expect(probe).toHaveBeenCalledOnce()
    expect(probe).toHaveBeenCalledWith('https://qayema.test/favicon.ico', {
      mode: 'no-cors',
      credentials: 'omit',
      cache: 'no-store',
    })
  })

  it('does not ask while the phone says it is offline', async () => {
    const probe = vi.fn()
    vi.stubGlobal('fetch', probe)
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)

    expect(await checkUnanswered('/user')).toBe('offline')
    expect(probe).not.toHaveBeenCalled()
  })

  it('reports what happened once a request gets through, and only once', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null)))
    await checkUnanswered('/user')
    await checkUnanswered('/dishes')
    const report = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', report)

    noteAnswered()
    noteAnswered()

    expect(report).toHaveBeenCalledOnce()
    const body = JSON.parse(report.mock.calls[0]![1].body as string)
    expect(report.mock.calls[0]![0]).toBe('https://qayema.test/api/client-errors')
    expect(body).toMatchObject({
      message: 'Unanswered requests: 2 blocked, 0 offline',
      source: 'network',
    })
    expect(body.stack).toContain('blocked /user')
    expect(body.stack).toContain('blocked /dishes')
  })

  it('reads the stored notes once, not after every answered request', () => {
    resetUnanswered()
    const read = vi.spyOn(Storage.prototype, 'getItem')

    noteAnswered()
    noteAnswered()
    noteAnswered()

    expect(read).toHaveBeenCalledOnce()
  })

  it('carries on when the site data cannot be read', () => {
    resetUnanswered()
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const report = vi.fn()
    vi.stubGlobal('fetch', report)

    expect(() => noteAnswered()).not.toThrow()
    expect(report).not.toHaveBeenCalled()
  })

  it('tells the screen, and forgets once a request gets through', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null)))
    const { result } = renderHook(() => useUnanswered())
    expect(result.current).toBeNull()

    await act(() => checkUnanswered('/user'))
    expect(result.current).toBe('blocked')

    act(() => noteAnswered())
    expect(result.current).toBeNull()
  })

  it('takes a refusal the page could read as blocked, without asking', async () => {
    const probe = vi.fn()
    vi.stubGlobal('fetch', probe)
    const { result } = renderHook(() => useUnanswered())

    act(() => noteBlocked('/user'))

    expect(result.current).toBe('blocked')
    expect(probe).not.toHaveBeenCalled()
  })
})
