import { describe, expect, it } from 'vitest'
import {
  amountTooBig,
  discountApplies,
  discountLine,
  discountNumber,
  discountedCents,
} from '@/features/offers/utils/discount'

describe('discount', () => {
  it('never makes a dish free: a discount taking all of the price does not apply', () => {
    expect(discountedCents(300, 'amount', 3)).toBe(300)
    expect(discountedCents(300, 'amount', 2.99)).toBe(1)
    expect(discountedCents(1, 'percent', 90)).toBe(1)
    expect(discountedCents(0, 'amount', 2)).toBe(0)
    expect(discountApplies(300, 'amount', 3)).toBe(false)
    expect(discountApplies(300, 'amount', 1)).toBe(true)
    expect(discountApplies(300, 'none', 1)).toBe(false)
  })

  it('takes an amount in the main currency off a dish in the second at the rate', () => {
    // LBP 100,000 off a $5.00 dish at 89,000: $1.12 off.
    expect(discountedCents(500, 'amount', 100000, 89000)).toBe(388)
    expect(discountApplies(300, 'amount', 300000, 89000)).toBe(false)
    expect(discountApplies(500, 'amount', 300000, 89000)).toBe(true)
    // Main USD: $1 off a LBP 450,000 dish is LBP 88,999.64 off at the stored rate.
    expect(discountedCents(45000000, 'amount', 1, 0.000011236)).toBe(36100036)
    // A percent is the same in any currency.
    expect(discountedCents(500, 'percent', 10, 89000)).toBe(450)
  })

  it('finds the cheapest chosen dish a fixed amount would take all of', () => {
    const dishes = [
      { id: 1, name: 'Kafta', price: '12.50', currency: 'USD', rate: 1 },
      { id: 2, name: 'Fries', price: '3.00', currency: 'USD', rate: 1 },
      { id: 3, name: 'Set menu', price: null, currency: 'USD', rate: 1 },
    ]
    const values = { discount_type: 'amount' as const, discount_value: '3', dish_ids: [1, 2, 3] }

    expect(amountTooBig(values, dishes)?.name).toBe('Fries')
    expect(amountTooBig({ ...values, discount_value: '2,5' }, dishes)).toBeNull()
    // Only the chosen ones, and a dish with no price of its own never counts.
    expect(amountTooBig({ ...values, dish_ids: [1, 3] }, dishes)).toBeNull()
    expect(amountTooBig({ ...values, discount_value: '' }, dishes)).toBeNull()
    expect(amountTooBig({ ...values, discount_type: 'percent' }, dishes)).toBeNull()
  })

  it('weighs an amount against each price turned into the main currency', () => {
    const dishes = [
      { id: 1, name: 'Burger', price: '5.00', currency: 'USD', rate: 89000 },
      { id: 2, name: 'Tea', price: '450000.00', currency: 'LBP', rate: 1 },
    ]
    const values = { discount_type: 'amount' as const, discount_value: '445000', dish_ids: [1, 2] }

    // $5.00 is LBP 445,000: all of it.
    expect(amountTooBig(values, dishes)?.name).toBe('Burger')
    expect(amountTooBig({ ...values, discount_value: '444999' }, dishes)).toBeNull()
  })

  it('reads a discount typed with a comma, and anything else as 0', () => {
    expect(discountNumber('2,5')).toBe(2.5)
    expect(discountNumber('20')).toBe(20)
    expect(discountNumber('abc')).toBe(0)
    expect(discountNumber('')).toBe(0)
  })

  it('says the discount and how many dishes it is on, or nothing without one', () => {
    const where = { locale: 'en' as const, currency: 'USD' }
    expect(discountLine({ type: 'percent', value: 20, dishes: 2 }, where)).toBe(
      '20% off on 2 dishes',
    )
    expect(discountLine({ type: 'amount', value: 2, dishes: 1 }, where)).toBe('$2.00 off on 1 dish')
    expect(discountLine({ type: 'none', value: 0, dishes: 3 }, where)).toBeNull()
  })
})
