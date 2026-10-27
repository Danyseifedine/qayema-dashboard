import { describe, expect, it } from 'vitest'
import {
  offerFormSchema,
  offerResponseSchema,
  toLocal,
  toOfferForm,
  toOfferPayload,
  type Deal,
  type Offer,
  type OfferFormValues,
} from '@/features/offers/schemas/offer.schema'

const saved: Offer = {
  id: 1,
  title: { en: 'Happy hour', ar: null },
  description: { en: null, ar: null },
  show_text: true,
  image_url: null,
  placements: ['popup'],
  banner_shape: 'square',
  popup_shape: 'tall',
  action: 'dishes',
  action_url: null,
  show_again: 'once',
  delay_seconds: 2,
  ad_delay_seconds: 2,
  ad_seconds: 6,
  discount_type: 'amount',
  discount_value: '2.50',
  dish_ids: [3],
  starts_at: '2026-11-01T18:30',
  ends_at: '2026-11-20T22:00',
  repeat: 'weekly',
  weekdays: ['fri'],
  month_days: [],
  time_windows: [{ from: '18:00', to: '22:00' }],
  is_active: false,
  status: 'paused',
  next_start: null,
  kept_off: null,
  deal: null,
}

function valid(overrides: Partial<OfferFormValues> = {}): OfferFormValues {
  return { ...toOfferForm(null, ['en']), title: { en: 'Deal' }, ...overrides }
}

function issues(values: OfferFormValues): string[] {
  const result = offerFormSchema.safeParse(values)
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'))
}

describe('offer schema', () => {
  it('starts a new offer as an always-on banner', () => {
    const form = toOfferForm(null, ['en', 'ar'])
    expect(form).toMatchObject({
      placements: ['banner'],
      when: 'always',
      all_day: true,
      title: { en: '', ar: '' },
    })
    expect(toOfferPayload(valid())).toMatchObject({
      starts_at: null,
      ends_at: null,
      repeat: 'always',
      time_windows: null,
      discount_value: null,
      dish_ids: [],
      action_url: null,
    })
  })

  it('reads a saved offer back into the form and sends the same schedule', () => {
    const form = toOfferForm(saved, ['en'])
    expect(form).toMatchObject({
      when: 'custom',
      starts_on: '2026-11-01',
      starts_time: '18:30',
      ends_on: '2026-11-20',
      ends_time: '22:00',
      all_day: false,
      discount_value: '2.5',
      is_active: false,
    })
    expect(toOfferPayload(form)).toMatchObject({
      starts_at: '2026-11-01T18:30',
      ends_at: '2026-11-20T22:00',
      repeat: 'weekly',
      weekdays: ['fri'],
      month_days: [],
      discount_value: 2.5,
      dish_ids: [3],
    })
  })

  it('keeps the shapes, and gives an offer saved before them the usual ones', () => {
    expect(toOfferForm(null, ['en'])).toMatchObject({
      banner_shape: 'rectangle',
      popup_shape: 'square',
    })
    expect(toOfferPayload(toOfferForm(saved, ['en']))).toMatchObject({
      banner_shape: 'square',
      popup_shape: 'tall',
    })

    const { banner_shape: _banner, popup_shape: _popup, ...older } = saved
    const parsed = offerResponseSchema.parse({ data: older }).data
    expect(parsed.banner_shape).toBe('rectangle')
    expect(parsed.popup_shape).toBe('square')
  })

  it('may be a banner, a pop-up and an ad together', () => {
    expect(issues(valid({ placements: ['banner', 'popup', 'ad'] }))).toEqual([])
    expect(issues(valid({ placements: [] }))).toEqual(['placements'])
    expect(toOfferForm(null, ['en']).ad_delay_seconds).toBe(2)

    const { ad_delay_seconds: _wait, ...older } = saved
    expect(offerResponseSchema.parse({ data: older }).data.ad_delay_seconds).toBe(2)
  })

  it('takes an end date without a time as the whole of that day', () => {
    expect(toLocal('2026-11-30', '', true)).toBe('2026-12-01T00:00')
    expect(toLocal('2026-12-31', '', true)).toBe('2027-01-01T00:00')
    expect(toLocal('2026-11-01', '', false)).toBe('2026-11-01T00:00')
    expect(toLocal('', '10:00', false)).toBeNull()
  })

  it('keeps the title and the text short enough for a card', () => {
    const result = offerFormSchema.safeParse(
      valid({ title: { en: 'x'.repeat(61) }, description: { en: 'y'.repeat(201) } }),
    )
    expect(result.success ? [] : result.error.issues.map((issue) => issue.message)).toEqual([
      'Keep the Title under 60 characters.',
      'Keep the Text under 200 characters.',
    ])
  })

  it('lets a picture alone go without a title, but never without its picture', () => {
    const alone = valid({ show_text: false, title: { en: '' } })
    expect(issues(alone)).toEqual(['image'])
    expect(issues({ ...alone, saved_image: true })).toEqual([])
    expect(issues({ ...alone, saved_image: true, image: 'removed' })).toEqual(['image'])
    expect(toOfferPayload({ ...alone, saved_image: true }).show_text).toBe(false)
  })

  it('accepts a complete offer', () => {
    expect(issues(valid())).toEqual([])
  })

  it('refuses an end before the start, and a repeat with no day', () => {
    expect(
      issues(
        valid({ when: 'custom', starts_on: '2026-11-10', ends_on: '2026-11-09', repeat: 'weekly' }),
      ),
    ).toEqual(['ends_on', 'weekdays'])
  })

  it('needs an amount above nothing', () => {
    const amount = { gives: 'discount' as const, discount_type: 'amount' as const, dish_ids: [1] }
    expect(issues(valid({ ...amount, discount_value: '0' }))).toEqual(['discount_value'])
    expect(issues(valid({ ...amount, discount_value: '1,5' }))).toEqual([])
  })

  it('needs a discount, or a tap showing the dishes, to give a discount on dishes', () => {
    expect(issues(valid({ gives: 'discount', dish_ids: [1] }))).toEqual(['discount_type'])
    expect(issues(valid({ gives: 'discount', action: 'dishes' }))).toEqual(['dish_ids'])
    expect(issues(valid({ gives: 'discount', action: 'dishes', dish_ids: [1] }))).toEqual([])
  })

  it('reads what a saved offer gives', () => {
    expect(toOfferForm(saved, ['en']).gives).toBe('discount')
    expect(toOfferForm({ ...saved, discount_type: 'none' }, ['en']).gives).toBe('discount')
    expect(toOfferForm({ ...saved, discount_type: 'none', action: 'link' }, ['en']).gives).toBe(
      'nothing',
    )
    expect(toOfferForm(null, ['en'])).toMatchObject({ gives: 'nothing', has_deal: false })
  })

  it('sends nothing to order without dishes, a discount or a tap showing them', () => {
    const left = valid({
      gives: 'nothing',
      action: 'dishes',
      discount_type: 'percent',
      discount_value: '10',
      dish_ids: [3],
    })
    expect(issues(left)).toEqual([])
    expect(toOfferPayload(left)).toMatchObject({
      action: 'none',
      discount_type: 'none',
      discount_value: null,
      dish_ids: [],
    })
    expect(toOfferPayload(left)).not.toHaveProperty('deal')
  })
  it('checks the times of day like the server', () => {
    const custom = { when: 'custom' as const, all_day: false }
    expect(issues(valid({ ...custom, time_windows: [{ from: '', to: '10:00' }] }))).toEqual([
      'time_windows.0.from',
    ])
    expect(issues(valid({ ...custom, time_windows: [{ from: '10:00', to: '10:00' }] }))).toEqual([
      'time_windows.0.to',
    ])
    expect(
      issues(
        valid({
          ...custom,
          time_windows: [
            { from: '12:00', to: '15:00' },
            { from: '14:00', to: '16:00' },
          ],
        }),
      ),
    ).toEqual(['time_windows.1.from'])
    expect(
      issues(
        valid({
          ...custom,
          time_windows: [
            { from: '22:00', to: '01:00' },
            { from: '23:00', to: '23:30' },
          ],
        }),
      ),
    ).toEqual(['time_windows.0.from'])
  })
})

describe('an offer with a deal dish', () => {
  const deal: Deal = {
    id: 40,
    name: { en: 'Family meal', ar: null },
    ingredients: { en: '2 pizzas, drinks', ar: null },
    price: '25.00',
    currency: null,
    category_id: 6,
    image_url: 'https://cdn.test/deal.webp',
    thumb_url: 'https://cdn.test/deal-thumb.webp',
    is_available: true,
  }
  const withDeal: Offer = {
    ...saved,
    action: 'dishes',
    discount_type: 'none',
    discount_value: null,
    dish_ids: [40],
    deal,
  }

  function dealValues(overrides: Partial<OfferFormValues['deal']> = {}): OfferFormValues {
    const form = valid({ gives: 'deal' })
    return {
      ...form,
      deal: {
        ...form.deal,
        name: { en: 'Family meal' },
        price: 25,
        category_id: 6,
        ...overrides,
      },
    }
  }

  it('is read without one from a server from before them', () => {
    const { deal: _deal, ...older } = withDeal
    expect(offerResponseSchema.parse({ data: older }).data.deal).toBeNull()
    expect(offerResponseSchema.parse({ data: withDeal }).data.deal).toEqual(deal)
  })

  it('reads its deal dish back into the form, without picking it as a dish', () => {
    expect(toOfferForm(withDeal, ['en', 'ar'])).toMatchObject({
      gives: 'deal',
      has_deal: true,
      dish_ids: [],
      deal: {
        name: { en: 'Family meal', ar: '' },
        ingredients: { en: '2 pizzas, drinks', ar: '' },
        price: 25,
        currency: '',
        category_id: 6,
        image: null,
        use_offer_image: false,
      },
    })
  })

  it("names a new deal dish after the offer, with the offer's picture", () => {
    expect(toOfferForm(saved, ['en']).deal).toEqual({
      name: { en: 'Happy hour' },
      ingredients: { en: '' },
      price: null,
      currency: '',
      category_id: null,
      image: null,
      use_offer_image: true,
    })
  })

  it('needs a name, a price above nothing and a category', () => {
    expect(issues(dealValues({ name: { en: '' }, price: 0, category_id: null }))).toEqual([
      'deal.name.en',
      'deal.price',
      'deal.category_id',
    ])
    expect(issues(dealValues({ price: null }))).toEqual(['deal.price'])
    expect(issues(dealValues())).toEqual([])
  })

  it("keeps the deal dish's name and what is in it as short as a dish's", () => {
    expect(
      issues(dealValues({ name: { en: 'x'.repeat(61) }, ingredients: { en: 'y'.repeat(301) } })),
    ).toEqual(['deal.name.en', 'deal.ingredients.en'])
  })

  it("sends a deal opened by a tap, with no discount or dishes, and the offer's picture", () => {
    const values = dealValues()
    const payload = toOfferPayload({
      ...values,
      action: 'link',
      action_url: 'https://example.com',
      discount_type: 'percent',
      discount_value: '10',
      dish_ids: [3],
    })
    expect(payload).toMatchObject({
      action: 'dishes',
      action_url: null,
      discount_type: 'none',
      discount_value: null,
      dish_ids: [],
      deal: {
        name: { en: 'Family meal' },
        ingredients: { en: '' },
        price: 25,
        currency: null,
        category_id: 6,
        use_offer_image: true,
      },
    })
    expect(payload.deal).not.toHaveProperty('image_key')
  })

  it('sends a new photo of its own, and otherwise keeps the one it has', () => {
    const own = { use_offer_image: false, currency: 'LBP' }
    const upload = {
      key: '0b7e1c2a-5f3d-4e8b-9a6c-2d1f0e9b8a7c',
      previewUrl: 'blob:deal',
      name: 'deal.jpg',
      optimizedSize: '120 KB',
      savedPercent: 40,
    }
    expect(toOfferPayload(dealValues({ ...own, image: upload })).deal).toMatchObject({
      image_key: '0b7e1c2a-5f3d-4e8b-9a6c-2d1f0e9b8a7c',
      use_offer_image: false,
      currency: 'LBP',
    })
    // The offer never removes the dish's photo; the Dishes page does.
    expect(toOfferPayload(dealValues({ ...own, image: 'removed' })).deal).not.toHaveProperty(
      'image_key',
    )
    expect(toOfferPayload(dealValues(own)).deal).not.toHaveProperty('image_key')
    // The offer's picture wins over a photo picked before switching back to it.
    expect(
      toOfferPayload(dealValues({ use_offer_image: true, image: upload })).deal,
    ).not.toHaveProperty('image_key')
  })

  it('removes a saved deal dish when the offer gives something else', () => {
    const form = toOfferForm(withDeal, ['en'])
    expect(toOfferPayload({ ...form, gives: 'nothing' })).toMatchObject({
      deal: null,
      action: 'none',
    })
    expect(toOfferPayload(form).deal).toMatchObject({ price: 25, category_id: 6 })
  })

  it('never sends an empty price or category, which the form refuses first', () => {
    expect(toOfferPayload(dealValues({ price: null, category_id: null })).deal).toMatchObject({
      price: 0,
      category_id: 0,
    })
  })
})
