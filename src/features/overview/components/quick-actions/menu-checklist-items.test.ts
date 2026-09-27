import { describe, expect, it } from 'vitest'
import type { Settings } from '@/features/settings/schemas/settings.schema'
import { makeDish } from '@/test/mocks/factories/menu'
import { menuChecklist } from './menu-checklist-items'

const CLOSED = { mon: null, tue: null, wed: null, thu: null, fri: null, sat: null, sun: null }

function settings(overrides: Partial<Settings> = {}): Settings {
  return {
    languages: ['en', 'ar'],
    second_locale: 'ar',
    default_locale: 'en',
    name: { en: 'Olive', ar: null },
    description: { en: null, ar: null },
    slug: 'olive',
    google_maps_url: null,
    phone: null,
    country_code: null,
    currency: 'USD',
    opening_hours: CLOSED,
    timezone: 'Asia/Beirut',
    logo_url: null,
    cover_url: null,
    ...overrides,
  }
}

const EMPTY = {
  dishes: { used: 0, limit: 40 },
  categories: { used: 0, limit: 10 },
  social_links: { used: 0, limit: 2 },
}

const done = (items: ReturnType<typeof menuChecklist>) =>
  items.filter((item) => item.done).map((item) => item.id)

describe('menuChecklist', () => {
  it('has everything to do on a new menu', () => {
    expect(done(menuChecklist({ settings: settings(), dishes: [], limits: EMPTY }))).toEqual([])
  })

  it('ticks off what the restaurant has filled in', () => {
    const items = menuChecklist({
      settings: settings({
        logo_url: 'https://cdn.test/logo.webp',
        description: { en: null, ar: 'مطعم' },
        opening_hours: { ...CLOSED, fri: { open: '12:00', close: '23:00' } },
        phone: '+96170000000',
      }),
      dishes: [makeDish({ image_url: 'https://cdn.test/a.webp' })],
      limits: { ...EMPTY, dishes: { used: 1, limit: 40 }, categories: { used: 1, limit: 10 } },
    })

    expect(done(items)).toEqual([
      'logo',
      'description',
      'hours',
      'phone',
      'categories',
      'dishes',
      'photos',
    ])
  })

  it('treats blank text as missing', () => {
    const items = menuChecklist({
      settings: settings({ description: { en: '   ', ar: '' }, google_maps_url: ' ' }),
      dishes: [],
      limits: EMPTY,
    })

    expect(done(items)).not.toContain('description')
    expect(done(items)).not.toContain('location')
  })

  it('counts the dishes that still need a photo', () => {
    const items = menuChecklist({
      settings: settings(),
      dishes: [
        makeDish({ image_url: null }),
        makeDish({ image_url: null }),
        makeDish({ image_url: 'https://cdn.test/b.webp' }),
      ],
      limits: EMPTY,
    })

    const photos = items.find((item) => item.id === 'photos')!
    expect(photos.done).toBe(false)
    expect(photos.label).toBe('2 dishes have no photo')
    expect(photos.action.target).toBe('dishes')
  })

  it('does not call photos done when there are no dishes', () => {
    const photos = menuChecklist({ settings: settings(), dishes: [], limits: EMPTY }).find(
      (item) => item.id === 'photos',
    )!

    expect(photos.done).toBe(false)
    expect(photos.label).toBe('Dish photos')
  })
})
