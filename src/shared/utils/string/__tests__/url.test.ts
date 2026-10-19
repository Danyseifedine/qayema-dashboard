import { describe, expect, it } from 'vitest'
import { withoutScheme } from '@/shared/utils/string/url'

describe('withoutScheme', () => {
  it('drops http and https, and nothing else', () => {
    expect(withoutScheme('https://qayema.com/olive')).toBe('qayema.com/olive')
    expect(withoutScheme('http://x.com/me')).toBe('x.com/me')
    expect(withoutScheme('qayema.com/https://')).toBe('qayema.com/https://')
  })
})
