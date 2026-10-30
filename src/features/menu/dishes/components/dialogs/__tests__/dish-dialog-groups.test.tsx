import { screen } from '@testing-library/react'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { makeCategory, makeDish, resetFactories } from '@/test/factories/menu'
import { makeSessionUser } from '@/test/factories/session'
import { renderWithProviders } from '@/test/render-with-providers'
import { DishDialog } from '@/features/menu/dishes/components/dialogs/dish-dialog'
import type { Dish } from '@/features/menu/dishes/schemas/dish.schema'

let mock: MockAdapter

const SAUCES = {
  id: 4,
  name: { en: 'Sauces', ar: null },
  min_select: 0,
  max_select: 2,
  addons: [
    { id: 41, name: { en: 'Garlic', ar: null }, price: '0.50' },
    { id: 42, name: { en: 'Chili', ar: null }, price: '0.50' },
    { id: 43, name: { en: 'Tahini', ar: null }, price: '1.00' },
  ],
}

function open(dish: Dish | null) {
  renderWithProviders(
    <DishDialog
      open
      dish={dish}
      dishes={[]}
      categories={[makeCategory({ id: 1, name: { en: 'Mezze', ar: null } })]}
      defaultCategoryId={null}
      currency="USD"
      secondCurrency={null}
      locale="en"
      onClose={vi.fn()}
      onOpenCategories={vi.fn()}
      onOpenBuilds={vi.fn()}
      onOpenOffers={vi.fn()}
    />,
  )
}

describe('add-on groups, in the dish window', () => {
  beforeEach(() => {
    resetFactories()
    mock = new MockAdapter(api)
    resetCsrfToken(api)
    installCsrfInterceptor(api)
    mock.onGet('/api/csrf-token').reply(200, { token: 'csrf' })
    mock.onGet('/api/user').reply(200, { data: makeSessionUser({ languages: ['en'] }) })
  })

  afterEach(() => {
    mock.restore()
    api.interceptors.request.clear()
    api.interceptors.response.clear()
    resetCsrfToken(api)
  })

  it('shows the groups its POS made, with their rule', async () => {
    open(makeDish({ id: 9, name: { en: 'Hummus', ar: null }, addon_groups: [SAUCES] }))

    expect(await screen.findByText('Add-on groups from your POS')).toBeInTheDocument()
    expect(screen.getByText('Sauces')).toBeInTheDocument()
    expect(screen.getByText('Pick up to 2')).toBeInTheDocument()
  })

  it('shows none for a dish without groups', async () => {
    open(makeDish({ id: 9, name: { en: 'Hummus', ar: null } }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.queryByText('Add-on groups from your POS')).not.toBeInTheDocument()
  })
})
