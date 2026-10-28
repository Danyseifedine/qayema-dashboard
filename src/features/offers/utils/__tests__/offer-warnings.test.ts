import { describe, expect, it } from 'vitest'
import type { Offer } from '@/features/offers/schemas/offer.schema'
import { offerWarnings, type MenuDish } from '@/features/offers/utils/offer-warnings'

function offer(id: number, overrides: Partial<Offer> = {}): Offer {
  return {
    id,
    placements: ['banner'],
    action: 'none',
    discount_type: 'none',
    discount_value: null,
    dish_ids: [],
    is_active: true,
    status: 'live',
    ...overrides,
  } as Offer
}

const DISHES: MenuDish[] = [
  { id: 1, name: 'Kafta', reference: 1250, rate: 1, shown: true },
  { id: 2, name: 'Fries', reference: 300, rate: 1, shown: true },
  { id: 3, name: 'Old soup', reference: 400, rate: 1, shown: false },
]

const kinds = (subject: Offer, offers: Offer[] = [subject], dishes = DISHES) =>
  offerWarnings(subject, offers, dishes).map((warning) => warning.kind)

describe('offerWarnings', () => {
  it('says when a discount or a tap has no dish left, or only hidden ones', () => {
    expect(kinds(offer(1, { discount_type: 'percent', discount_value: '10' }))).toEqual([
      'noDishes',
    ])
    expect(kinds(offer(1, { action: 'dishes' }))).toEqual(['noDishes'])
    expect(kinds(offer(1, { action: 'dishes', dish_ids: [3] }))).toEqual(['allHidden'])
    expect(kinds(offer(1, { action: 'dishes', dish_ids: [1, 3] }))).toEqual([])
    // A plain promotion names no dishes, and needs none.
    expect(kinds(offer(1))).toEqual([])
    // The dish checks wait for the dishes.
    expect(offerWarnings(offer(1, { action: 'dishes', dish_ids: [3] }), [], undefined)).toEqual([])
  })

  it('names the dishes a fixed amount takes all of', () => {
    const subject = offer(1, { discount_type: 'amount', discount_value: '3.00', dish_ids: [1, 2] })
    expect(offerWarnings(subject, [subject], DISHES)).toEqual([
      { kind: 'tooBig', dishes: ['Fries'] },
    ])
  })

  it('takes an amount in the main currency off a dish in the second at the rate', () => {
    // LBP 300,000 off: $3.37 off a $5.00 dish, all of a $3.00 one.
    const usd: MenuDish[] = [
      { id: 1, name: 'Burger', reference: 500, rate: 89000, shown: true },
      { id: 2, name: 'Fries', reference: 300, rate: 89000, shown: true },
    ]
    const subject = offer(1, {
      discount_type: 'amount',
      discount_value: '300000',
      dish_ids: [1, 2],
    })

    expect(offerWarnings(subject, [subject], usd)).toEqual([{ kind: 'tooBig', dishes: ['Fries'] }])
  })

  it('says which pop-up or ad waits behind the first one in the order', () => {
    const first = offer(1, { placements: ['popup'] })
    const later = offer(2, { placements: ['ad'], status: 'scheduled' })
    const paused = offer(3, { placements: ['popup'], is_active: false, status: 'paused' })
    const offers = [paused, first, later]

    expect(offerWarnings(first, offers, DISHES)).toEqual([])
    expect(offerWarnings(later, offers, DISHES)).toEqual([{ kind: 'waits', behind: first }])
    expect(offerWarnings(paused, offers, DISHES)).toEqual([])
  })

  it('says what the package keeps off: a schedule, its places, one place, the discount', () => {
    const parts = { schedules: false, discounts: false }
    const slots = {
      banner: { used: 0, limit: 3 },
      popup: { used: 0, limit: 0 },
      ad: { used: 0, limit: 1 },
    }
    const pkg = { parts, slots }
    const of = (subject: Offer) => offerWarnings(subject, [subject], DISHES, pkg)

    expect(of(offer(1, { status: 'off', kept_off: 'schedules' }))).toEqual([
      { kind: 'schedulesOff' },
    ])
    expect(of(offer(1, { status: 'off', kept_off: 'places', placements: ['popup'] }))).toEqual([
      { kind: 'placesOff' },
    ])
    expect(of(offer(1, { placements: ['banner', 'popup'], kept_off: null }))).toEqual([
      { kind: 'placeOff', place: 'popup' },
    ])
    expect(
      of(
        offer(1, { discount_type: 'percent', discount_value: '10', dish_ids: [1], kept_off: null }),
      ),
    ).toEqual([{ kind: 'discountOff' }])
    // With every part on the package, nothing to say.
    expect(
      offerWarnings(offer(1, { kept_off: null }), [], DISHES, {
        parts: { schedules: true, discounts: true },
        slots: { ...slots, popup: { used: 0, limit: 1 } },
      }),
    ).toEqual([])
  })
})
