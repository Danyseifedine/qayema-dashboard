import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { pageKeyFromPath, usePageKey } from '@/app/layouts/authenticated/use-page-key'

describe('pageKeyFromPath', () => {
  it('reads a nav key from the path', () => {
    expect(pageKeyFromPath('/categories')).toBe('categories')
    expect(pageKeyFromPath('/social-links/')).toBe('social-links')
    expect(pageKeyFromPath('/account')).toBe('account')
  })

  it('has no page for the root or an unknown path', () => {
    expect(pageKeyFromPath('/')).toBeNull()
    expect(pageKeyFromPath('/nowhere')).toBeNull()
    expect(pageKeyFromPath('/categories/extra')).toBeNull()
  })

  it('reads a path given without the base', () => {
    expect(pageKeyFromPath('dishes')).toBe('dishes')
  })
})

describe('usePageKey', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/')
  })

  it('opens the page in the URL, so a refresh stays on it', () => {
    window.history.replaceState(null, '', '/dishes')

    const { result } = renderHook(() => usePageKey('overview'))

    expect(result.current[0]).toBe('dishes')
  })

  it('lands on the given page at the root and writes it into the URL', () => {
    const { result } = renderHook(() => usePageKey('design'))

    expect(result.current[0]).toBe('design')
    expect(window.location.pathname).toBe('/design')
  })

  it('pushes each page it opens, and follows the back button', () => {
    const { result } = renderHook(() => usePageKey('overview'))

    act(() => result.current[1]('qr'))
    expect(result.current[0]).toBe('qr')
    expect(window.location.pathname).toBe('/qr')

    act(() => {
      window.history.replaceState(null, '', '/overview')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(result.current[0]).toBe('overview')
  })

  it('replaces the entry for a page handed over rather than chosen', () => {
    const { result } = renderHook(() => usePageKey('overview'))
    const before = window.history.length

    act(() => result.current[1]('features', { replace: true }))

    expect(window.location.pathname).toBe('/features')
    expect(window.history.length).toBe(before)
  })

  it('falls back to the landing page when the back button reaches the root', () => {
    window.history.replaceState(null, '', '/qr')
    const { result } = renderHook(() => usePageKey('overview'))
    expect(result.current[0]).toBe('qr')

    act(() => {
      window.history.replaceState(null, '', '/')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(result.current[0]).toBe('overview')
  })

  it('adds no history entry for the page already open', () => {
    window.history.replaceState(null, '', '/dishes')
    const { result } = renderHook(() => usePageKey('overview'))
    const push = vi.spyOn(window.history, 'pushState')

    act(() => result.current[1]('dishes'))

    expect(push).not.toHaveBeenCalled()
    expect(result.current[0]).toBe('dishes')
    push.mockRestore()
  })
})
