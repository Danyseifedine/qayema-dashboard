import { describe, expect, it } from 'vitest'
import { missingBuildTranslations } from '@/features/build-your-own/utils/build-translations'

const LANGUAGES = ['en', 'ar']

describe('missingBuildTranslations', () => {
  it('finds the dish’s name and its own list’s names', () => {
    expect(
      missingBuildTranslations(
        {
          dish: { name: { en: 'Build your pizza', ar: '' } },
          source: 'own',
          choices: [{ name: { en: 'Vanilla', ar: 'فانيلا' } }, { name: { en: 'Mango', ar: '' } }],
        },
        LANGUAGES,
      ),
    ).toEqual([
      { path: 'dish.name.ar', text: 'Build your pizza', from: 'en', to: 'ar', max: 60 },
      { path: 'choices.1.name.ar', text: 'Mango', from: 'en', to: 'ar', max: 40 },
    ])
  })

  it('leaves out a list a category build only keeps', () => {
    expect(
      missingBuildTranslations(
        {
          dish: { name: { en: 'Pizza', ar: 'بيتزا' } },
          source: 'category',
          choices: [{ name: { en: 'Unused', ar: '' } }],
        },
        LANGUAGES,
      ),
    ).toEqual([])
  })
})
