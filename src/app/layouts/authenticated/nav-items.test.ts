import { describe, expect, it } from 'vitest'
import { NAV_ITEMS, isNavItemLocked } from '@/app/layouts/authenticated/nav-items'

const ALL_FEATURES = { qr_studio: true, ordering: true, advanced_analytics: true }

const NO_TEMPLATE = { hasTemplate: false, plan: ALL_FEATURES }
const READY = { hasTemplate: true, plan: ALL_FEATURES }

describe('isNavItemLocked', () => {
  it('locks the sections that need a template before one is chosen', () => {
    expect(isNavItemLocked('restaurant', NO_TEMPLATE)).toBe(true)
    expect(isNavItemLocked('categories', NO_TEMPLATE)).toBe(true)
    expect(isNavItemLocked('dishes', NO_TEMPLATE)).toBe(true)
    expect(isNavItemLocked('qr', NO_TEMPLATE)).toBe(true)
    expect(isNavItemLocked('orders', NO_TEMPLATE)).toBe(true)
    expect(isNavItemLocked('colors-fonts', NO_TEMPLATE)).toBe(true)
  })

  it('always leaves Design open, since it is the way out of the locked state', () => {
    expect(isNavItemLocked('design', NO_TEMPLATE)).toBe(false)
  })

  it('leaves the sections that do not need a template open', () => {
    for (const key of ['overview', 'analytics', 'design', 'package', 'account', 'social-links']) {
      expect(isNavItemLocked(key, NO_TEMPLATE), `${key} should be open`).toBe(false)
    }
  })

  it('locks a section when the plan does not include its feature', () => {
    expect(
      isNavItemLocked('orders', {
        hasTemplate: true,
        plan: { ...ALL_FEATURES, ordering: false },
      }),
    ).toBe(true)

    // Gating is data-driven, so one flag being off leaves the other alone.
    expect(
      isNavItemLocked('analytics', {
        hasTemplate: true,
        plan: { ...ALL_FEATURES, ordering: false },
      }),
    ).toBe(false)
  })

  it("keeps the QR code page open without the studio: the plain code is everyone's", () => {
    expect(
      isNavItemLocked('qr', { hasTemplate: true, plan: { ...ALL_FEATURES, qr_studio: false } }),
    ).toBe(false)
  })

  it('opens everything once a template is chosen and the feature is on', () => {
    for (const item of NAV_ITEMS) {
      expect(isNavItemLocked(item.key, READY), `${item.key} should be open`).toBe(false)
    }
  })

  it('treats an unknown key as open rather than silently locking it', () => {
    expect(isNavItemLocked('does-not-exist', NO_TEMPLATE)).toBe(false)
  })
})

describe('landing section', () => {
  // The rule App.tsx applies when it picks where to open.
  const landingKey = (hasTemplate: boolean) => (hasTemplate ? 'overview' : 'design')

  it('never opens on a section the owner cannot use', () => {
    for (const hasTemplate of [true, false]) {
      const key = landingKey(hasTemplate)
      expect(
        isNavItemLocked(key, {
          hasTemplate,
          plan: { qr_studio: false, ordering: false, advanced_analytics: false },
        }),
        `landing on ${key} with hasTemplate=${hasTemplate}`,
      ).toBe(false)
    }
  })

  it('sends an owner with no design to Design', () => {
    expect(landingKey(false)).toBe('design')
  })
})
