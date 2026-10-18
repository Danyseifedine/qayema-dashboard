import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeDish, resetFactories } from '@/test/factories/menu'
import { formatMoney } from '@/shared/utils/format/money'
import { DishCard, type DishCardProps } from '@/features/menu/dishes/components/list/dish-card'
import type { Dish } from '@/features/menu/dishes/schemas/dish.schema'

const usd = (amount: number) => formatMoney(amount, 'USD', 'en')

function renderCard(dish: Dish, props: Partial<DishCardProps> = {}) {
  const callbacks = {
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onToggleAvailability: vi.fn(),
  }
  render(
    <DishCard
      dish={dish}
      currency="USD"
      locale="en"
      handle={<span>drag</span>}
      showVariants
      showAddons
      {...callbacks}
      {...props}
    />,
  )
  return callbacks
}

/** A dish with no price of its own: Size and Spice price it, plus a list not set up yet. */
const BY_VARIANTS = {
  price: null,
  variants: [
    {
      id: 1,
      name: { en: 'Size' },
      options: [
        { id: 11, name: { en: 'Large' }, price: '6.50' },
        { id: 12, name: { en: 'Small' }, price: '4.00' },
      ],
    },
    {
      id: 2,
      name: { en: 'Spice' },
      options: [
        { id: 21, name: { en: 'Hot' }, price: '1.00' },
        { id: 22, name: { en: 'Mild' }, price: '0.00' },
      ],
    },
    { id: 3, name: { en: 'Bread' }, options: [] },
  ],
  addons: [{ id: 31, name: { en: 'Extra cheese' }, price: '1.50' }],
} satisfies Partial<Dish>

describe('DishCard', () => {
  beforeEach(() => {
    resetFactories()
  })

  it('shows the dish on its face, and hands it back to edit, delete or sell out', async () => {
    const user = userEvent.setup()
    const dish = makeDish({
      name: { en: 'Fattoush', ar: null },
      ingredients: { en: 'Toasted bread, sumac, mint', ar: null },
      price: '7.00',
      image_url: 'https://cdn.qayema.test/fattoush.webp',
    })
    const { onEdit, onDelete, onToggleAvailability } = renderCard(dish)

    expect(screen.getByRole('heading', { name: 'Fattoush' })).toBeInTheDocument()
    expect(screen.getByText(usd(7))).toBeInTheDocument()
    expect(screen.getByText('Toasted bread, sumac, mint')).toBeInTheDocument()
    expect(document.querySelector('img')).toHaveAttribute(
      'src',
      'https://cdn.qayema.test/fattoush.webp',
    )
    expect(screen.getByText('Available')).toBeInTheDocument()
    expect(screen.queryByText('Sold out')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Edit Fattoush' }))
    expect(onEdit).toHaveBeenCalledWith(dish)

    await user.click(screen.getByRole('button', { name: 'Delete Fattoush' }))
    expect(onDelete).toHaveBeenCalledWith(dish)

    await user.click(screen.getByRole('switch', { name: 'Fattoush is available' }))
    expect(onToggleAvailability).toHaveBeenCalledWith(dish, false)
  })

  it('marks a sold-out dish, and switches it back on', async () => {
    const user = userEvent.setup()
    const dish = makeDish({ name: { en: 'Kibbeh', ar: null }, is_available: false })
    const { onToggleAvailability } = renderCard(dish)

    expect(screen.getByText('Sold out')).toBeInTheDocument()
    expect(screen.getByText('Hidden')).toBeInTheDocument()
    const toggle = screen.getByRole('switch', { name: 'Kibbeh is available' })
    expect(toggle).not.toBeChecked()

    await user.click(toggle)
    expect(onToggleAvailability).toHaveBeenCalledWith(dish, true)
  })

  it('prices a dish by its variants at the least a guest pays, and counts its choices', () => {
    renderCard(makeDish({ name: { en: 'Shawarma', ar: null }, ...BY_VARIANTS }))

    // Small (4.00) plus Mild (0.00); a variant with no options adds nothing.
    expect(screen.getByText(usd(4))).toBeInTheDocument()
    expect(screen.getByText('3 variants · 1 add-on')).toBeInTheDocument()
  })

  it('shows no price and no choices while variants and add-ons are off', () => {
    renderCard(makeDish({ name: { en: 'Shawarma', ar: null }, ...BY_VARIANTS }), {
      showVariants: false,
      showAddons: false,
    })

    expect(screen.queryByText(/\$/)).not.toBeInTheDocument()
    expect(screen.queryByText(/variant/)).not.toBeInTheDocument()
    expect(screen.queryByText(/add-on/)).not.toBeInTheDocument()
  })

  it('names a dish without a name plainly, in the card and its controls', () => {
    renderCard(makeDish({ name: { en: null, ar: null }, price: null }))

    expect(screen.getByRole('heading', { name: 'Untitled dish' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit dish' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete dish' })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Dish is available' })).toBeInTheDocument()
    // No photo yet: a placeholder stands in.
    expect(document.querySelector('img')).toBeNull()
  })
})
