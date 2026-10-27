import { describe, expect, it } from 'vitest'
import { orderResponseSchema } from '@/features/orders/schemas/order.schema'

const ORDER = {
  id: 1,
  reference: 'ABC234',
  status: 'placed',
  currency: 'LBP',
  total: '2230000.00',
  note: null,
  placed_at: '2026-09-24T11:30:00+00:00',
}

const LINE = { id: 1, name: 'Burger', unit_price: '10.00', quantity: 2, line_total: '20.00' }

describe('orderResponseSchema', () => {
  it('reads each line in its own currency, and the rate the order was placed at', () => {
    const { data } = orderResponseSchema.parse({
      data: { ...ORDER, exchange_rate: '89000.0000000000', items: [{ ...LINE, currency: 'USD' }] },
    })

    expect(data.exchange_rate).toBe('89000.0000000000')
    expect(data.items[0]!.currency).toBe('USD')
  })

  it('puts every line of an answer from before in the order currency, with no rate', () => {
    const { data } = orderResponseSchema.parse({ data: { ...ORDER, items: [LINE] } })

    expect(data.exchange_rate).toBeNull()
    expect(data.items[0]!.currency).toBe('LBP')
  })

  it('reads the dish a guest built from parts, as the line keeps it', () => {
    const built = {
      name: 'Your pizza',
      shape: 'split',
      parts: [
        { choice: 'Margherita', share: 2 },
        { choice: 'Pepperoni', share: 2 },
      ],
      price: '15.00',
      build_id: 4,
      keys: ['d12', 'd13'],
    }
    const { data } = orderResponseSchema.parse({
      data: {
        ...ORDER,
        items: [{ ...LINE, options: { variants: [], addons: [], builds: [built] } }],
      },
    })

    expect(data.items[0]!.options?.builds).toEqual([built])
  })

  it('reads a line without builds as before', () => {
    const { data } = orderResponseSchema.parse({
      data: {
        ...ORDER,
        items: [
          {
            ...LINE,
            options: { variants: [{ name: 'Size', choice: 'Large', price: '2.00' }], addons: [] },
          },
        ],
      },
    })

    expect(data.items[0]!.options?.builds).toBeUndefined()
    expect(data.items[0]!.options?.variants).toHaveLength(1)
  })

  it('refuses a build of a shape it does not know', () => {
    const result = orderResponseSchema.safeParse({
      data: {
        ...ORDER,
        items: [
          {
            ...LINE,
            options: {
              variants: [],
              addons: [],
              builds: [
                { name: 'X', shape: 'stack', parts: [], price: '0.00', build_id: 1, keys: [] },
              ],
            },
          },
        ],
      },
    })

    expect(result.success).toBe(false)
  })
})
