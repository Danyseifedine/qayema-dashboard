import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reloadOnNewRelease } from '@/app/new-release'

function fakeWindow() {
  const target = new EventTarget() as unknown as Window
  const reload = vi.fn()
  Object.assign(target, { sessionStorage: window.sessionStorage, location: { reload } })
  return { target, reload }
}

function missingFile(target: Window): Event {
  const event = new Event('vite:preloadError', { cancelable: true })
  target.dispatchEvent(event)
  return event
}

describe('reloadOnNewRelease', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    window.sessionStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('loads the new release when a page file from the old one is gone', () => {
    const { target, reload } = fakeWindow()
    reloadOnNewRelease(target)

    const event = missingFile(target)

    expect(reload).toHaveBeenCalledOnce()
    expect(event.defaultPrevented).toBe(true)
  })

  it('does not reload in a loop when the new release is missing it too', () => {
    const { target, reload } = fakeWindow()
    reloadOnNewRelease(target)

    missingFile(target)
    const again = missingFile(target)

    expect(reload).toHaveBeenCalledOnce()
    // Left to fail where it is, so the error shows instead of a loop.
    expect(again.defaultPrevented).toBe(false)

    vi.advanceTimersByTime(30_001)
    missingFile(target)
    expect(reload).toHaveBeenCalledTimes(2)
  })
})
