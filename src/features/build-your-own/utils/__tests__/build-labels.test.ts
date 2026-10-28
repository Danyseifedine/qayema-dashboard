import { describe, expect, it } from 'vitest'
import { i18n } from '@/lib/i18n'
import {
  partName,
  partOf,
  sizeLabel,
  sizesSummary,
} from '@/features/build-your-own/utils/build-labels'

const t = i18n.getFixedT('en', 'build-your-own')

describe('build labels', () => {
  it('names each size as an owner says it', () => {
    expect([1, 2, 3, 4, 5].map((count) => sizeLabel(t, 'split', count))).toEqual([
      'Whole',
      'Half & half',
      'Thirds',
      'Quarters',
      '5 parts',
    ])
    expect(sizeLabel(t, 'pieces', 1)).toBe('1 piece')
    expect(sizeLabel(t, 'pieces', 3)).toBe('3 pieces')
  })

  it('names one part, and a part filled with a choice', () => {
    expect([2, 3, 4, 6].map((count) => partName(t, count))).toEqual([
      'Half',
      'Third',
      'Quarter',
      '1/6',
    ])
    expect([2, 3, 4, 5].map((count) => partOf(t, count, 'Veggie'))).toEqual([
      'half Veggie',
      'a third Veggie',
      'a quarter Veggie',
      '1/5 Veggie',
    ])
  })

  it('says the sizes a build allows as a sentence starts', () => {
    expect(sizesSummary(t, 'split', [3, 2], 'en')).toBe('Halves and thirds')
    expect(sizesSummary(t, 'split', [1, 4, 6], 'en')).toBe('Whole, quarters, and 6 parts')
    expect(sizesSummary(t, 'pieces', [3, 2], 'en')).toBe('2 or 3 pieces')
    expect(sizesSummary(t, 'pieces', [1], 'en')).toBe('1 piece')
    expect(sizesSummary(t, 'split', [], 'en')).toBe('No parts picked yet')
  })
})
