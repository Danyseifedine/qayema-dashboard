import { describe, expect, it } from 'vitest'
import type { Dish } from '@/features/menu'
import { isSellable, unitPrice, variantsToPick } from '@/features/orders/utils/order-edit'

const ON = { variants: true, addons: true }
const OFF = { variants: false, addons: false }

function dish(overrides: Partial<Dish> = {}): Dish {
  return {
    id: 1,
    name: { en: 'Burger' },
    ingredients: { en: null },
    price: '8.00',
    is_available: true,
    category_id: 1,
    image_url: null,
    variants: [
      {
        id: 10,
        name: { en: 'Size' },
        options: [
          { id: 11, name: { en: 'Small' }, price: '0.00' },
          { id: 12, name: { en: 'Large' }, price: '2.50' },
        ],
      },
      {
        id: 20,
        name: { en: 'Bun' },
        options: [{ id: 21, name: { en: 'Brioche' }, price: '1.00' }],
      },
    ],
    addons: [{ id: 30, name: { en: 'Cheese' }, price: '1.25' }],
    ...overrides,
  }
}

describe('order edit pricing', () => {
  it('adds each picked option and add-on to the dish', () => {
    expect(unitPrice(dish(), [12], [30], ON)).toBe(11.75)
  })

  it('asks only for variants with a real choice, and none while they are off', () => {
    expect(variantsToPick(dish(), ON).map((variant) => variant.id)).toEqual([10])
    expect(variantsToPick(dish(), OFF)).toEqual([])
    expect(unitPrice(dish(), [12], [30], OFF)).toBe(8)
  })

  it('sells a dish without a price only when its variants price it', () => {
    expect(isSellable(dish({ price: null }), ON)).toBe(true)
    expect(isSellable(dish({ price: null }), OFF)).toBe(false)
  })
})
