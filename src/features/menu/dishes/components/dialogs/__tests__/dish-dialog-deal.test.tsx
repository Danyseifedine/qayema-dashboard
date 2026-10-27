import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { makeCategory, makeDish, resetFactories } from '@/test/factories/menu'
import { makeSessionUser } from '@/test/factories/session'
import { renderWithProviders } from '@/test/render-with-providers'
import { useUiStore } from '@/stores/ui.store'
import { DishDialog } from '@/features/menu/dishes/components/dialogs/dish-dialog'
import type { Dish } from '@/features/menu/dishes/schemas/dish.schema'

let mock: MockAdapter

/** The deal dish the offer "Pizza night" made. */
function dealDish(title: Record<string, string | null> = { en: 'Pizza night' }): Dish {
  return makeDish({
    id: 40,
    name: { en: 'Family meal' },
    offer: { id: 3, title, status: 'live', next_start: null },
  })
}

function open(dish: Dish) {
  const onClose = vi.fn()
  const onOpenOffers = vi.fn()
  renderWithProviders(
    <DishDialog
      open
      dish={dish}
      dishes={[]}
      categories={[makeCategory({ id: 1, name: { en: 'Deals', ar: null } })]}
      defaultCategoryId={null}
      currency="USD"
      secondCurrency={null}
      locale="en"
      onClose={onClose}
      onOpenCategories={vi.fn()}
      onOpenBuilds={vi.fn()}
      onOpenOffers={onOpenOffers}
    />,
  )
  return { onClose, onOpenOffers }
}

describe('a deal dish, in the dish window', () => {
  beforeEach(() => {
    resetFactories()
    mock = new MockAdapter(api)
    resetCsrfToken(api)
    installCsrfInterceptor(api)
    mock.onGet('/api/csrf-token').reply(200, { token: 'csrf' })
    mock.onGet('/api/user').reply(200, { data: makeSessionUser({ languages: ['en'] }) })
  })

  afterEach(() => {
    useUiStore.setState({ offerToEdit: null })
    mock.restore()
    api.interceptors.request.clear()
    api.interceptors.response.clear()
    resetCsrfToken(api)
  })

  it('says which offer made it, with the way to that offer', async () => {
    const user = userEvent.setup()
    const { onClose, onOpenOffers } = open(dealDish())

    expect(
      await screen.findByText(
        'Made by the offer “Pizza night”. It shows on your menu only while the offer is running.',
      ),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Open the offer' }))

    expect(useUiStore.getState().offerToEdit).toBe(3)
    expect(onClose).toHaveBeenCalled()
    expect(onOpenOffers).toHaveBeenCalled()
  })

  it('names an offer without a title as such', async () => {
    open(dealDish({ en: null }))
    expect(await screen.findByText(/^Made by the offer “Untitled offer”\./)).toBeInTheDocument()
  })

  it('says nothing of offers for a dish of its own', async () => {
    open(makeDish({ id: 41 }))
    expect(await screen.findByRole('button', { name: 'Save dish' })).toBeInTheDocument()
    expect(screen.queryByText(/Made by the offer/)).toBeNull()
  })
})
