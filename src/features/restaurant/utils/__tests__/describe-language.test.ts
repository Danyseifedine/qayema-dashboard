import { describe, expect, it } from 'vitest'
import { describeLanguage } from '@/features/restaurant/utils/describe-language'

describe('describeLanguage', () => {
  it('names a language in the dashboard language and in its own', () => {
    expect(describeLanguage('fr')).toBe('French · Français')
  })

  it('names it once when both names are the same word', () => {
    expect(describeLanguage('en')).toBe('English')
  })
})
