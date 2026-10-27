import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BuildPicker } from '@/features/orders/components/edit/build-picker'
import type { BuildToFill } from '@/features/orders/utils/order-edit'

const CHOICES: BuildToFill['choices'] = [
  { key: 'c1', name: { en: 'Cheese' }, price: '10.00', part_prices: null, sizes: {} },
  { key: 'c2', name: { en: 'Free' }, price: '0.00', part_prices: null, sizes: {} },
]

function show(build: Partial<BuildToFill>, value?: (string | null)[]) {
  const onChange = vi.fn()
  render(
    <BuildPicker
      build={{
        id: 1,
        name: { en: 'Yours' },
        shape: 'split',
        parts: [1],
        choices: CHOICES,
        sizes: [],
        ...build,
      }}
      value={value}
      onChange={onChange}
      currency="USD"
      locale="en"
    />,
  )
  return { onChange, user: userEvent.setup() }
}

describe('BuildPicker', () => {
  it('names each way to split it', async () => {
    const { onChange, user } = show({ parts: [1, 2, 3, 4, 5] })

    await user.click(screen.getByRole('combobox', { name: 'Yours: how many' }))
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Whole',
      'Half & half',
      'Thirds',
      'Quarters',
      '5 parts',
    ])
    await user.click(screen.getByRole('option', { name: 'Thirds' }))
    expect(onChange).toHaveBeenCalledWith([null, null, null])
  })

  it('counts pieces, one or many', async () => {
    const { user } = show({ shape: 'pieces', parts: [1, 2] })

    await user.click(screen.getByRole('combobox', { name: 'Yours: how many' }))
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      '1 piece',
      '2 pieces',
    ])
  })

  it('prices each part at its share, and says nothing for a free choice', async () => {
    const { user } = show({ parts: [3] }, [null, null, null])

    await user.click(screen.getByRole('combobox', { name: 'Yours, part 3' }))
    expect(screen.getByRole('option', { name: /^Cheese/ })).toHaveTextContent('+$3.33')
    expect(screen.getByRole('option', { name: 'Free' })).toBeInTheDocument()
  })
})
