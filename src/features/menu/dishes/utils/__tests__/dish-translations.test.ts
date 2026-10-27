import { describe, expect, it } from 'vitest'
import {
  missingChoiceTranslations,
  missingDishTranslations,
} from '@/features/menu/dishes/utils/dish-translations'
import { withTranslations } from '@/shared/utils/string/missing-translations'

const LANGUAGES = ['en', 'ar'] as const

function dish(overrides: Partial<Parameters<typeof missingDishTranslations>[0]> = {}) {
  return {
    name: { en: 'Kebab', ar: '' },
    ingredients: { en: '', ar: 'لحم، بصل' },
    variants: [
      {
        name: { en: 'Size', ar: 'الحجم' },
        options: [{ name: { en: 'Small', ar: '' } }, { name: { en: '  ', ar: ' ' } }],
      },
    ],
    addons: [{ name: { en: 'Extra bread', ar: '' } }],
    price: 9,
    ...overrides,
  }
}

describe('dish translations', () => {
  it('finds every text written in one language only, either way, with its field limit', () => {
    expect(missingDishTranslations(dish(), LANGUAGES)).toEqual([
      { path: 'name.ar', text: 'Kebab', from: 'en', to: 'ar', max: 60 },
      { path: 'ingredients.en', text: 'لحم، بصل', from: 'ar', to: 'en', max: 300 },
      { path: 'variants.0.options.0.name.ar', text: 'Small', from: 'en', to: 'ar', max: 40 },
      { path: 'addons.0.name.ar', text: 'Extra bread', from: 'en', to: 'ar', max: 40 },
    ])
  })

  it('finds only the choices for the variants and add-ons button', () => {
    expect(missingChoiceTranslations(dish(), LANGUAGES).map((piece) => piece.path)).toEqual([
      'variants.0.options.0.name.ar',
      'addons.0.name.ar',
    ])
  })

  it('has nothing to translate on a menu in one language', () => {
    expect(missingDishTranslations(dish(), ['en'])).toEqual([])
  })
  it('puts each translation at its path, leaving the values handed in as they were', () => {
    const values = dish()
    const missing = missingDishTranslations(values, LANGUAGES)

    const filled = withTranslations(values, missing, ['كباب', 'Lamb, onion', 'صغير'])

    expect(filled.name).toEqual({ en: 'Kebab', ar: 'كباب' })
    expect(filled.ingredients).toEqual({ en: 'Lamb, onion', ar: 'لحم، بصل' })
    expect(filled.variants[0]!.options[0]!.name).toEqual({ en: 'Small', ar: 'صغير' })
    // An answer short of one leaves that text as it was.
    expect(filled.addons[0]!.name).toEqual({ en: 'Extra bread', ar: '' })
    expect(filled.price).toBe(9)
    expect(values.name).toEqual({ en: 'Kebab', ar: '' })
  })
})
