import type { Deal, Offer } from '@/features/offers/schemas/offer.schema'

/** An offer as the API sends one: a live banner, always on, giving nothing, unless told. */
export function makeOffer(overrides: Partial<Offer> = {}): Offer {
  return {
    id: 1,
    title: { en: 'Happy hour' },
    description: { en: 'Two for one' },
    show_text: true,
    image_url: null,
    placements: ['banner'],
    banner_shape: 'rectangle',
    popup_shape: 'square',
    action: 'none',
    action_url: null,
    show_again: 'every_visit',
    delay_seconds: 0,
    ad_delay_seconds: 2,
    ad_seconds: 6,
    discount_type: 'none',
    discount_value: null,
    dish_ids: [],
    starts_at: null,
    ends_at: null,
    repeat: 'always',
    weekdays: [],
    month_days: [],
    time_windows: null,
    is_active: true,
    status: 'live',
    next_start: null,
    kept_off: null,
    deal: null,
    ...overrides,
  }
}

/** An offer's deal dish: a family meal at $25.00 with its photo, unless told. */
export function makeDeal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: 40,
    name: { en: 'Family meal' },
    ingredients: { en: '2 pizzas, 4 drinks' },
    price: '25.00',
    currency: null,
    category_id: 6,
    image_url: 'https://cdn.test/deal.webp',
    thumb_url: 'https://cdn.test/deal-thumb.webp',
    is_available: true,
    ...overrides,
  }
}
