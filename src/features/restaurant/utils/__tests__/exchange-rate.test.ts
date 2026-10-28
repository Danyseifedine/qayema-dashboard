import { describe, expect, it } from 'vitest'
import type { Restaurant } from '@/features/restaurant/schemas/restaurant.schema'
import {
  defaultRate,
  flipRate,
  toExchangeRate,
  toRateForm,
} from '@/features/restaurant/utils/exchange-rate'

function saved(overrides: Partial<Restaurant> = {}): Restaurant {
  return {
    languages: ['en'],
    name: { en: 'Olive' },
    description: { en: null },
    slug: 'olive',
    google_maps_url: null,
    phone: null,
    country_code: null,
    currency: 'LBP',
    second_currency: 'USD',
    exchange_rate: '89000.0000000000',
    opening_hours: { mon: null, tue: null, wed: null, thu: null, fri: null, sat: null, sun: null },
    timezone: 'Asia/Beirut',
    logo_url: null,
    cover_url: null,
    ...overrides,
  }
}

describe('toRateForm', () => {
  it('is empty without a rate', () => {
    expect(toRateForm(null)).toEqual({ rate_one: 'second', rate: null })
  })

  it('makes the side worth more the 1', () => {
    expect(toRateForm('89000.0000000000')).toEqual({ rate_one: 'second', rate: 89000 })
    expect(toRateForm('0.0000112360')).toEqual({ rate_one: 'main', rate: 89000 })
  })
})

describe('defaultRate', () => {
  it('starts USD and LBP on 1 USD = 89,000 LBP, either way round', () => {
    expect(defaultRate('LBP', 'USD')).toEqual({ rate_one: 'second', rate: 89000 })
    expect(defaultRate('USD', 'LBP')).toEqual({ rate_one: 'main', rate: 89000 })
  })

  it('leaves any other pair, or none, to be typed', () => {
    expect(defaultRate('EUR', 'USD')).toEqual({ rate_one: 'second', rate: null })
    expect(defaultRate('USD', null)).toEqual({ rate_one: 'second', rate: null })
  })
})

describe('flipRate', () => {
  it('turns the rate round, there and back', () => {
    expect(flipRate({ rate_one: 'second', rate: 89000 })).toEqual({
      rate_one: 'main',
      rate: 0.000011236,
    })
    expect(flipRate({ rate_one: 'main', rate: 0.000011236 })).toEqual({
      rate_one: 'second',
      rate: 89000,
    })
  })

  it('keeps an empty or wrong number as it is', () => {
    expect(flipRate({ rate_one: 'second', rate: null })).toEqual({ rate_one: 'main', rate: null })
    expect(flipRate({ rate_one: 'main', rate: 0 })).toEqual({ rate_one: 'second', rate: 0 })
  })
})

describe('toExchangeRate', () => {
  it('is null without a second currency or a rate', () => {
    expect(toExchangeRate({ second_currency: '', rate_one: 'second', rate: 5 }, saved())).toBeNull()
    expect(
      toExchangeRate({ second_currency: null, rate_one: 'second', rate: 5 }, saved()),
    ).toBeNull()
    expect(
      toExchangeRate({ second_currency: 'USD', rate_one: 'second', rate: null }, saved()),
    ).toBeNull()
  })

  it('sends a rate left as it was exactly as the server sent it', () => {
    const before = saved({ currency: 'USD', second_currency: 'LBP', exchange_rate: '0.0000112360' })

    expect(toExchangeRate({ second_currency: 'LBP', rate_one: 'main', rate: 89000 }, before)).toBe(
      '0.0000112360',
    )
  })

  it('sends a rate only turned round exactly as the server sent it, not its rounded inverse', () => {
    const turned = flipRate(toRateForm('89000.0000000000'))

    expect(toExchangeRate({ second_currency: 'USD', ...turned }, saved())).toBe('89000.0000000000')
    // Turned round and then changed is a new rate.
    expect(
      toExchangeRate({ second_currency: 'USD', rate_one: 'main', rate: 0.00001 }, saved()),
    ).toBeCloseTo(100000)
  })

  it('sends a new rate as main per one second', () => {
    expect(
      toExchangeRate({ second_currency: 'USD', rate_one: 'second', rate: 90000 }, saved()),
    ).toBe(90000)
    expect(toExchangeRate({ second_currency: 'LBP', rate_one: 'main', rate: 80000 }, saved())).toBe(
      1 / 80000,
    )
    expect(toExchangeRate({ second_currency: 'USD', rate_one: 'main', rate: 89000 }, saved())).toBe(
      1 / 89000,
    )
  })
})
