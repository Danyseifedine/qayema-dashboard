import { describe, expect, it } from 'vitest'
import type { Restaurant } from '@/features/restaurant'
import { makeDish } from '@/test/factories/menu'
import {
  menuChecklist,
  setupSteps,
} from '@/features/overview/components/checklist/menu-checklist-items'

const CLOSED = { mon: null, tue: null, wed: null, thu: null, fri: null, sat: null, sun: null }

function settings(overrides: Partial<Restaurant> = {}): Restaurant {
  return {
    languages: ['en', 'ar'],
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

  it('groups the checklist into three steps, in the order an owner goes', () => {
    const steps = setupSteps(menuChecklist({ settings: settings(), dishes: [], limits: EMPTY }))

    expect(steps.map((step) => step.id)).toEqual(['restaurant', 'menu', 'share'])
    expect(steps[0]!.items.map((item) => item.id)).toEqual([
      'logo',
      'cover',
      'description',
      'hours',
      'location',
      'phone',
    ])
    expect(steps[1]!.items.map((item) => item.id)).toEqual(['categories', 'dishes', 'photos'])
    expect(steps[2]!.items.map((item) => item.id)).toEqual(['social'])
    expect(steps.every((step) => !step.done)).toBe(true)
  })

  it('marks a step done once all its items are, and leaves out an empty one', () => {
    const items = menuChecklist({
      settings: settings(),
      dishes: [],
      limits: { ...EMPTY, social_links: { used: 1, limit: 2 } },
    })

    const share = setupSteps(items).find((step) => step.id === 'share')!
    expect(share.done).toBe(true)
    // A section switched off takes its items, and so its step, away.
    expect(setupSteps(items.filter((item) => item.id !== 'social')).map((step) => step.id)).toEqual(
      ['restaurant', 'menu'],
    )
  })
})
