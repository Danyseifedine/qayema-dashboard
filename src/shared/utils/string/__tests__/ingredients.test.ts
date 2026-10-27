import { describe, expect, it } from 'vitest'
import {
  MAX_INGREDIENTS,
  splitIngredients,
  tidyIngredients,
} from '@/shared/utils/string/ingredients'

// The same cases as the backend's tests/Unit/Support/IngredientsTest.
describe('tidyIngredients', () => {
  it.each([
    ['dots, commas and etc', 'onion,..tomato...ect', 'en', 'onion, tomato'],
    ['already clean', 'Lamb, rice, almonds', 'en', 'Lamb, rice, almonds'],
    ['one per line with bullets', '• Lamb\n• Rice\r\n- Almonds', 'en', 'Lamb, Rice, Almonds'],
    ['semicolons and spaces', '  lamb ;  rice;;  ', 'en', 'lamb, rice'],
    ['repeats once', 'Rice, rice, RICE, lamb', 'en', 'Rice, lamb'],
    [
      'a sentence stays readable',
      'Slow-cooked lamb with rice, served with yogurt.',
      'en',
      'Slow-cooked lamb with rice, served with yogurt',
    ],
    ['a number keeps its dot', 'Cheese 1.5 kg, bread', 'en', 'Cheese 1.5 kg, bread'],
    ['ellipsis', 'salt… pepper', 'en', 'salt, pepper'],
    ['arabic separators', 'بصل،طماطم؛ بقدونس... إلخ', 'ar', 'بصل، طماطم، بقدونس'],
    ['chinese comma', '米饭、羊肉', 'zh', '米饭、羊肉'],
    ['nothing but etc', 'etc...', 'en', ''],
    ['blank', '   ', 'en', ''],
  ])('%s', (_name, typed, language, tidy) => {
    expect(tidyIngredients(typed, language)).toBe(tidy)
  })

  it('reads nothing as nothing', () => {
    expect(tidyIngredients(null, 'en')).toBe('')
    expect(splitIngredients(undefined)).toEqual([])
  })

  it('stops at its limit', () => {
    const typed = Array.from({ length: 60 }, (_, i) => `item ${i + 1}`).join(',')
    expect(splitIngredients(typed)).toHaveLength(MAX_INGREDIENTS)
  })
})
