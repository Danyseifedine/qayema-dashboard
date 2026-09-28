import { describe, expect, it } from 'vitest'
import { NAV_ITEMS, navLock } from '@/app/layouts/authenticated/nav-items'
import { EMPTY_PLAN, FULL_PLAN } from '@/test/mocks/factories/session'

const NO_TEMPLATE = { hasTemplate: false, plan: FULL_PLAN }
const READY = { hasTemplate: true, plan: FULL_PLAN }
const FREE = { hasTemplate: true, plan: EMPTY_PLAN }

describe('navLock', () => {
  it('locks the sections that need a template before one is chosen', () => {
    for (const key of ['restaurant', 'categories', 'dishes', 'qr', 'orders', 'appearance']) {
      expect(navLock(key, NO_TEMPLATE), key).toBe('template')
    }
  })

  it('always leaves Design open, since it is the way out of the locked state', () => {
    expect(navLock('design', NO_TEMPLATE)).toBeNull()
  })

  it('leaves the sections that do not need a template open', () => {
    for (const key of ['overview', 'analytics', 'design', 'package', 'account', 'social-links']) {
      expect(navLock(key, NO_TEMPLATE), `${key} should be open`).toBeNull()
    }
  })

  it('names the package as the reason when the plan lacks the feature', () => {
    expect(navLock('orders', FREE)).toBe('plan')
    expect(navLock('analytics', FREE)).toBe('plan')
    expect(navLock('appearance', FREE)).toBe('plan')
  })

  it('gates each section on its own flag only', () => {
    const access = { hasTemplate: true, plan: { ...FULL_PLAN, ordering: false } }

    expect(navLock('orders', access)).toBe('plan')
    expect(navLock('analytics', access)).toBeNull()
  })

  it('reports the missing design before the missing package', () => {
    expect(navLock('orders', { hasTemplate: false, plan: EMPTY_PLAN })).toBe('template')
  })

  it("keeps the QR code page open without the studio: the plain code is everyone's", () => {
    expect(navLock('qr', FREE)).toBeNull()
  })

  it('opens everything once a template is chosen and every feature is on', () => {
    for (const item of NAV_ITEMS) {
      expect(navLock(item.key, READY), `${item.key} should be open`).toBeNull()
    }
  })

  it('treats an unknown key as open rather than silently locking it', () => {
    expect(navLock('does-not-exist', NO_TEMPLATE)).toBeNull()
  })
})

describe('landing section', () => {
  // The rule App.tsx applies when it picks where to open.
  const landingKey = (hasTemplate: boolean) => (hasTemplate ? 'overview' : 'design')

  it('never opens on a section the owner cannot use', () => {
    for (const hasTemplate of [true, false]) {
      const key = landingKey(hasTemplate)
      expect(
        navLock(key, { hasTemplate, plan: EMPTY_PLAN }),
        `landing on ${key} with hasTemplate=${hasTemplate}`,
      ).toBeNull()
    }
  })

  it('sends an owner with no design to Design', () => {
    expect(landingKey(false)).toBe('design')
  })
})
