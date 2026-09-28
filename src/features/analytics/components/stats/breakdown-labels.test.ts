import { describe, expect, it } from 'vitest'
import { languageItems } from '@/features/analytics/components/stats/breakdown-labels'

describe('languageItems', () => {
  it('names a known language and gives each row its share', () => {
    expect(
      languageItems([
        { key: 'en', count: 3 },
        { key: 'ar', count: 1 },
      ]),
    ).toEqual([
      { id: 'en', label: 'English', value: 3, detail: '75%' },
      { id: 'ar', label: 'العربية', value: 1, detail: '25%' },
    ])
  })

  it('says "Unknown" when the language could not be told', () => {
    expect(languageItems([{ key: 'unknown', count: 2 }])[0]?.label).toBe('Unknown')
  })

  it('keeps the raw code of a language the menu does not name', () => {
    expect(languageItems([{ key: 'xx', count: 2 }])[0]?.label).toBe('xx')
  })

  it('gives no share when nothing was counted', () => {
    expect(languageItems([{ key: 'en', count: 0 }])[0]?.detail).toBeUndefined()
  })
})
