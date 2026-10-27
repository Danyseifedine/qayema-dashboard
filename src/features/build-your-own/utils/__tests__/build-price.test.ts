import { describe, expect, it } from 'vitest'
import {
  buildPriceCents,
  cheapestCents,
  partPriceCents,
  shareCents,
  type BuildPart,
  type BuildShape,
} from '@/features/build-your-own/utils/build-price'

// The cases of ../qayema/tests/Unit/Services/Menu/BuildPriceTest.php: the
// same parts must come to the same cents here.
const MARGHERITA: BuildPart = { price: '12.00', part_prices: { '2': '7.00' } }
const PEPPERONI: BuildPart = { price: '16.00', part_prices: null }
const VEGGIE: BuildPart = { price: '12.25', part_prices: {} }

const CASES: [string, BuildShape, BuildPart[], number][] = [
  ['a whole pizza is its price', 'split', [PEPPERONI], 1600],
  ['two halves without set prices share the whole', 'split', [PEPPERONI, VEGGIE], 1413],
  ['a half the owner priced keeps that price', 'split', [MARGHERITA, PEPPERONI], 1500],
  ['both halves of the same', 'split', [PEPPERONI, PEPPERONI], 1600],
  ['thirds share once, rounded half up', 'split', [VEGGIE, VEGGIE, PEPPERONI], 1350],
  ['a price set for halves is not a third', 'split', [MARGHERITA, PEPPERONI, PEPPERONI], 1467],
  ['pieces add up whole', 'pieces', [VEGGIE, VEGGIE, PEPPERONI], 4050],
  ["part prices are no pieces' business", 'pieces', [MARGHERITA, MARGHERITA], 2400],
  ['nothing built adds nothing', 'split', [], 0],
]

describe('buildPriceCents', () => {
  it.each(CASES)('%s', (_, shape, parts, price) => {
    expect(buildPriceCents(shape, parts)).toBe(price)
  })

  it('reads the form too: numbers, and part prices as a list by count', () => {
    const margherita: BuildPart = { price: 12, part_prices: [null, null, 7] }
    expect(buildPriceCents('split', [margherita, { price: 16 }])).toBe(1500)
  })
})

describe('partPriceCents', () => {
  it('is only for a part size', () => {
    expect(partPriceCents({ '2': '7' }, 2)).toBe(700)
    expect(partPriceCents({ '1': '9.00' }, 1)).toBeNull()
    expect(partPriceCents({ '2': 'cheap' }, 2)).toBeNull()
    expect(partPriceCents({ '2': '' }, 2)).toBeNull()
    expect(partPriceCents({ '2': Number.NaN }, 2)).toBeNull()
    expect(partPriceCents(null, 3)).toBeNull()
    expect(partPriceCents([null, null, null, 5], 3)).toBe(500)
  })
})

describe('shareCents', () => {
  it('cuts a whole price into one part, rounded half up', () => {
    expect(shareCents('12.25', 2)).toBe(613)
    expect(shareCents(16, 3)).toBe(533)
    expect(shareCents('12.00', 2)).toBe(600)
  })
})

describe('cheapestCents', () => {
  it('is its cheapest count and choice, as the server works out the card\'s "from"', () => {
    // Whole: $12; halves: two set halves at $7 is $14. The whole wins.
    expect(cheapestCents('split', [1, 2], [MARGHERITA, PEPPERONI])).toBe(1200)
    // Halves only: two of Margherita's set halves.
    expect(cheapestCents('split', [2], [MARGHERITA, PEPPERONI])).toBe(1400)
    // Two to three scoops: two of the cheapest.
    expect(cheapestCents('pieces', [2, 3], [MARGHERITA, PEPPERONI])).toBe(2400)
    expect(cheapestCents('split', [2], [])).toBe(0)
    expect(cheapestCents('split', [], [MARGHERITA])).toBe(0)
  })
})
