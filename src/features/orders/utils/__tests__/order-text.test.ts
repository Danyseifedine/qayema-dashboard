import { describe, expect, it } from 'vitest'
import { builtText, choiceParts, statusLabel } from '@/features/orders/utils/order-text'

describe('statusLabel', () => {
  it('names a table order new, preparing, served', () => {
    expect(statusLabel({ status: 'placed', fulfilment: 'dine_in' })).toBe('status.placed')
    expect(statusLabel({ status: 'accepted', fulfilment: 'dine_in' })).toBe('status.preparing')
    expect(statusLabel({ status: 'ready', fulfilment: 'dine_in' })).toBe('status.preparing')
    expect(statusLabel({ status: 'done', fulfilment: 'dine_in' })).toBe('status.served')
    expect(statusLabel({ status: 'cancelled', fulfilment: 'dine_in' })).toBe('status.cancelled')
  })

  it('says a ready delivery is on its way, a ready pickup ready', () => {
    expect(statusLabel({ status: 'ready', fulfilment: 'delivery' })).toBe('status.onItsWay')
    expect(statusLabel({ status: 'ready', fulfilment: 'pickup' })).toBe('status.ready')
    expect(statusLabel({ status: 'accepted', fulfilment: 'delivery' })).toBe('status.accepted')
    expect(statusLabel({ status: 'done', fulfilment: null })).toBe('status.done')
  })
})

describe('choiceParts', () => {
  it('names each variant with its choice, then each add-on', () => {
    expect(
      choiceParts([{ name: 'Size', choice: 'Large' }], [{ name: 'Cheese' }, { name: 'Fries' }]),
    ).toEqual(['Size: Large', '+ Cheese', '+ Fries'])
    expect(choiceParts([], [])).toEqual([])
  })

  it('names each build after the variants and before the add-ons, as the server does', () => {
    expect(
      choiceParts(
        [{ name: 'Size', choice: 'Large' }],
        [{ name: 'Cheese' }],
        [
          {
            name: 'Your pizza',
            parts: [
              { choice: 'Margherita', share: 2 },
              { choice: 'Pepperoni', share: 2 },
            ],
          },
          {
            name: 'Your scoops',
            parts: [
              { choice: 'Vanilla', share: 1 },
              { choice: 'Chocolate', share: 1 },
              { choice: 'Vanilla', share: 1 },
            ],
          },
        ],
      ),
    ).toEqual([
      'Size: Large',
      'Your pizza: ½ Margherita + ½ Pepperoni',
      'Your scoops: 2 × Vanilla, Chocolate',
      '+ Cheese',
    ])
  })
})

describe('builtText', () => {
  const split = (share: number, ...choices: string[]) =>
    builtText(choices.map((choice) => ({ choice, share })))

  it('reads a split into parts with the fraction of each', () => {
    expect(split(2, 'Margherita', 'Pepperoni')).toBe('½ Margherita + ½ Pepperoni')
    expect(split(3, 'A', 'B', 'C')).toBe('⅓ A + ⅓ B + ⅓ C')
    expect(split(4, 'A', 'B', 'C', 'D')).toBe('¼ A + ¼ B + ¼ C + ¼ D')
    expect(split(5, 'A')).toBe('⅕ A')
    expect(split(6, 'A')).toBe('⅙ A')
    expect(split(8, 'A')).toBe('⅛ A')
    expect(split(7, 'A', 'B')).toBe('1/7 A + 1/7 B')
  })

  it('reads a whole as its choice alone', () => {
    expect(split(1, 'Margherita')).toBe('Margherita')
  })

  it('counts the pieces of each choice, in the order first picked', () => {
    expect(split(1, 'Vanilla', 'Chocolate', 'Vanilla')).toBe('2 × Vanilla, Chocolate')
    expect(split(1, 'Mint', 'Mint', 'Mint')).toBe('3 × Mint')
    expect(builtText([])).toBe('')
  })
})
