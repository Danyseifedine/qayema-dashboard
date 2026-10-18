import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { usePageHero } from '@/app/layouts/authenticated/topbar/use-page-hero'

const at = (hour: number) => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 16, hour, 0))
}

describe('usePageHero', () => {
  afterEach(() => vi.useRealTimers())

  it('greets the owner on Home by the part of their day', () => {
    at(4)
    expect(renderHook(() => usePageHero('overview', 'Dany')).result.current).toEqual({
      eyebrow: 'Good evening,',
      title: 'Dany',
      subtitle: "Here's what's happening with your restaurant today.",
    })
    at(5)
    expect(renderHook(() => usePageHero('overview', 'Dany')).result.current.eyebrow).toBe(
      'Good morning,',
    )
    at(12)
    expect(renderHook(() => usePageHero('overview', 'Dany')).result.current.eyebrow).toBe(
      'Good afternoon,',
    )
    at(17)
    expect(renderHook(() => usePageHero('overview', 'Dany')).result.current.eyebrow).toBe(
      'Good evening,',
    )
  })

  it('names every other page twice, with the line it opens with', () => {
    expect(renderHook(() => usePageHero('qr', 'Dany')).result.current).toEqual({
      eyebrow: 'QR code',
      title: 'QR code',
      subtitle:
        'Guests scan this to open your menu. Customise it, download it, or print it for your tables.',
    })
    expect(renderHook(() => usePageHero('more', 'Dany')).result.current.title).toBe('More')
    expect(renderHook(() => usePageHero('design', 'Dany')).result.current.subtitle).toBe(
      'Pick how your menu looks',
    )
  })

  it('gives every section a line, and a page it does not know none', () => {
    for (const key of [
      'analytics',
      'orders',
      'table-orders',
      'categories',
      'dishes',
      'appearance',
      'tables',
      'social-links',
      'restaurant',
      'features',
      'package',
      'account',
    ]) {
      expect(renderHook(() => usePageHero(key, 'Dany')).result.current.subtitle, key).not.toBe('')
    }
    expect(renderHook(() => usePageHero('nowhere', 'Dany')).result.current).toEqual({
      eyebrow: 'Dashboard',
      title: 'Dashboard',
      subtitle: '',
    })
  })
})
