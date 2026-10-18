import { describe, expect, it } from 'vitest'
import {
  restaurantFormSchema,
  weekdayLabel,
  type RestaurantFormValues,
} from '@/features/restaurant/schemas/restaurant.schema'

const OPEN = { closed: false, shifts: [{ open: '09:00', close: '22:00' }] }

function valid(): RestaurantFormValues {
  return {
    name: { en: 'Beit Qayema', ar: '' },
    description: { en: 'Home cooking.', ar: '' },
    google_maps_url: '',
    country_code: 'LB',
    phone: '70 123 456',
    currency: 'USD',
    timezone: 'Asia/Beirut',
    opening_hours: {
      mon: OPEN,
      tue: OPEN,
      wed: OPEN,
      thu: OPEN,
      fri: OPEN,
      sat: OPEN,
      sun: { closed: true, shifts: [{ open: 'whatever', close: '' }] },
    },
    logo: null,
    cover_image: null,
  }
}

/** Every message the schema gives, keyed by the path it points at. */
function problems(values: unknown): Record<string, string> {
  const result = restaurantFormSchema.safeParse(values)
  if (result.success) return {}
  return Object.fromEntries(
    result.error.issues.map((issue) => [issue.path.join('.'), issue.message]),
  )
}

/** Every message at one path, when several checks fail on the same field. */
function messagesAt(values: unknown, path: string): string[] {
  const result = restaurantFormSchema.safeParse(values)
  if (result.success) return []
  return result.error.issues
    .filter((issue) => issue.path.join('.') === path)
    .map((issue) => issue.message)
}

describe('restaurantFormSchema', () => {
  it('accepts a complete restaurant, ignoring the times of a closed day', () => {
    expect(problems(valid())).toEqual({})
    expect(problems({ ...valid(), google_maps_url: null })).toEqual({})
    expect(problems({ ...valid(), google_maps_url: 'https://maps.google.com/x' })).toEqual({})
  })

  it('wants both times of every shift of an open day as HH:MM', () => {
    const values = valid()
    values.opening_hours.mon = {
      closed: false,
      shifts: [
        { open: '12:00', close: '15:00' },
        { open: '9am', close: '24:00' },
      ],
    }

    expect(problems(values)).toEqual({
      'opening_hours.mon.shifts.1.open': 'Pick a time.',
      'opening_hours.mon.shifts.1.close': 'Pick a time.',
    })
  })

  it('takes a split day, and refuses shifts that overlap or a late one before the last', () => {
    const values = valid()
    values.opening_hours.fri = {
      closed: false,
      shifts: [
        { open: '18:00', close: '01:00' },
        { open: '12:00', close: '15:00' },
      ],
    }
    expect(problems(values)).toEqual({})

    values.opening_hours.fri.shifts = [
      { open: '12:00', close: '16:00' },
      { open: '15:00', close: '23:00' },
    ]
    expect(problems(values)).toEqual({
      'opening_hours.fri.shifts.1.open': "Shifts on the same day can't overlap.",
    })

    values.opening_hours.fri.shifts = [
      { open: '20:00', close: '02:00' },
      { open: '22:00', close: '23:00' },
    ]
    expect(problems(values)).toEqual({
      'opening_hours.fri.shifts.0.open': 'Only the last shift of a day can run past midnight.',
    })
  })

  it('caps the name and description by language', () => {
    expect(
      problems({
        ...valid(),
        name: { en: 'x'.repeat(256) },
        description: { en: 'x'.repeat(2001) },
      }),
    ).toEqual({
      'name.en': 'Keep the restaurant name under 255 characters.',
      'description.en': 'Keep the description under 2000 characters.',
    })
  })

  it('takes only a real web link for the location', () => {
    expect(problems({ ...valid(), google_maps_url: 'not a link' })).toEqual({
      google_maps_url: 'Enter a valid link, starting with https://',
    })
    expect(problems({ ...valid(), google_maps_url: 'ftp://maps.example.com/x' })).toEqual({
      google_maps_url: 'Enter a valid link, starting with https://',
    })
    expect(
      problems({ ...valid(), google_maps_url: `https://maps.google.com/${'x'.repeat(2048)}` }),
    ).toEqual({ google_maps_url: 'That link is too long.' })
  })

  it('wants a country, currency and timezone from the lists', () => {
    expect(problems({ ...valid(), country_code: 'XX', currency: 'XXX', timezone: '' })).toEqual({
      country_code: 'Please choose a country from the list.',
      currency: 'Please choose a currency from the list.',
      timezone: 'Choose a timezone.',
    })
  })

  it('checks the phone number', () => {
    expect(messagesAt({ ...valid(), phone: '  ' }, 'phone')).toContain(
      'A phone number is required.',
    )
    expect(messagesAt({ ...valid(), phone: '1'.repeat(31) }, 'phone')).toContain(
      'That phone number is too long.',
    )
    expect(problems({ ...valid(), phone: '12-34' })).toEqual({
      phone: 'Please enter a valid phone number using digits only.',
    })
  })

  it('wants the name in English, of two characters, with no control characters', () => {
    expect(problems({ ...valid(), name: { en: '', ar: 'بيت' } })).toEqual({
      'name.en': 'The restaurant name is required in English.',
    })
    expect(problems({ ...valid(), name: { en: 'Beit', ar: 'ب' } })).toEqual({
      'name.ar': 'The restaurant name must be at least 2 characters.',
    })
    expect(problems({ ...valid(), name: { en: 'Be\u0007it', ar: '' } })).toEqual({
      'name.en': 'The restaurant name contains characters that are not allowed.',
    })
  })
})

describe('weekdayLabel', () => {
  it('names the day in the dashboard language', () => {
    expect(weekdayLabel('sun')).toBe('Sunday')
  })

  it('says the English name is missing even when another field is also wrong', () => {
    const values = { ...valid(), name: { en: '', ar: 'بيت' }, currency: '' }

    const found = problems(values)

    expect(found['name.en']).toBeDefined()
    expect(found.currency).toBeDefined()
  })
})
