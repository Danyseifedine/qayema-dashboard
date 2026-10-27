import type { TFunction } from 'i18next'
import type { BuildShape } from '@/features/build-your-own/utils/build-price'

type T = TFunction<'build-your-own'>

/**
 * A size as the owner picks it: a pizza is Whole, Half & half, Thirds,
 * Quarters, then "5 parts"; separate pieces are "3 pieces".
 */
export function sizeLabel(t: T, shape: BuildShape, count: number): string {
  if (shape === 'pieces') return t('sizes.pieces', { count })
  if (count === 1) return t('sizes.whole')
  if (count === 2) return t('sizes.halves')
  if (count === 3) return t('sizes.thirds')
  if (count === 4) return t('sizes.quarters')
  return t('sizes.parts', { count })
}

/** One part of `count`: Half, Third, Quarter, then "1/5". */
export function partName(t: T, count: number): string {
  if (count === 2) return t('partName.2')
  if (count === 3) return t('partName.3')
  if (count === 4) return t('partName.4')
  return t('partName.other', { count })
}

/** A part of `count` filled with `name`: "half Margherita", "1/5 Veggie". */
export function partOf(t: T, count: number, name: string): string {
  if (count === 2) return t('fraction.2', { name })
  if (count === 3) return t('fraction.3', { name })
  if (count === 4) return t('fraction.4', { name })
  return t('fraction.other', { count, name })
}

/** A list in the reader's words: "halves and thirds", "2 or 3". */
function joined(items: string[], locale: string, type: 'conjunction' | 'disjunction'): string {
  return new Intl.ListFormat(locale, { type }).format(items)
}

/**
 * The sizes a build allows, as a sentence starts: "Whole, halves and
 * thirds" for a pizza, "2 or 3 pieces" for scoops.
 */
export function sizesSummary(
  t: T,
  shape: BuildShape,
  parts: readonly number[],
  locale: string,
): string {
  const counts = [...parts].sort((a, b) => a - b)
  if (counts.length === 0) return t('summary.noSizes')
  if (shape === 'pieces') {
    return t('summary.pieces', {
      count: counts.at(-1),
      counts: joined(counts.map(String), locale, 'disjunction'),
    })
  }
  const words = counts.map((count) => {
    if (count === 1) return t('summary.whole')
    if (count === 2) return t('summary.halves')
    if (count === 3) return t('summary.thirds')
    if (count === 4) return t('summary.quarters')
    return t('summary.parts', { count })
  })
  const text = joined(words, locale, 'conjunction')
  return text.charAt(0).toLocaleUpperCase(locale) + text.slice(1)
}
