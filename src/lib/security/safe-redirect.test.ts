import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveSafeRedirect, safeRedirect } from '@/lib/security/safe-redirect'

// jsdom cannot navigate, so `location` is swapped for one whose `assign` is a spy.
const assign = vi.fn()

describe('safe redirect', () => {
  beforeEach(() => {
    vi.stubGlobal('location', {
      ...window.location,
      origin: 'https://dashboard.qayema.test',
      assign,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    assign.mockReset()
  })

  describe('resolveSafeRedirect', () => {
    it('allows the API origin and our own origin', () => {
      expect(resolveSafeRedirect('https://qayema.test/get-started')?.href).toBe(
        'https://qayema.test/get-started',
      )
      expect(resolveSafeRedirect('https://dashboard.qayema.test/overview')?.href).toBe(
        'https://dashboard.qayema.test/overview',
      )
    })

    it('resolves a relative path against our own origin', () => {
      expect(resolveSafeRedirect('/categories')?.href).toBe(
        'https://dashboard.qayema.test/categories',
      )
    })

    it('rejects any other origin, even a lookalike', () => {
      expect(resolveSafeRedirect('https://evil.example/phish')).toBeNull()
      expect(resolveSafeRedirect('https://qayema.test.evil.example/')).toBeNull()
      expect(resolveSafeRedirect('//evil.example/phish')).toBeNull()
      expect(resolveSafeRedirect('http://qayema.test/get-started')).toBeNull()
    })

    it('rejects script and data URLs', () => {
      expect(resolveSafeRedirect('javascript:alert(1)')).toBeNull()
      expect(resolveSafeRedirect('data:text/html,<script>alert(1)</script>')).toBeNull()
    })

    it('rejects something that is not a URL at all', () => {
      expect(resolveSafeRedirect('http://')).toBeNull()
    })
  })

  describe('safeRedirect', () => {
    it('navigates to an allowed target', () => {
      expect(safeRedirect('https://qayema.test/onboarding')).toBe(true)
      expect(assign).toHaveBeenCalledWith('https://qayema.test/onboarding')
    })

    it('stays put for a rejected target', () => {
      expect(safeRedirect('https://evil.example/')).toBe(false)
      expect(assign).not.toHaveBeenCalled()
    })
  })
})
