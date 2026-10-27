import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { makeBuild, makeCategory, makeDish, resetFactories } from '@/test/factories/menu'
import { FULL_PLAN, makeSessionUser } from '@/test/factories/session'
import { renderWithProviders } from '@/test/render-with-providers'
import type { AuthRestaurant } from '@/features/auth'
import { useUiStore } from '@/stores/ui.store'
import { DishDialog } from '@/features/menu/dishes/components/dialogs/dish-dialog'
import type { Dish } from '@/features/menu/dishes/schemas/dish.schema'

let mock: MockAdapter

const CATEGORIES = [makeCategory({ id: 1, name: { en: 'Pizzas', ar: null } })]

/** A dish guests build, with no price of its own. */
function builtDish(): Dish {
  return makeDish({ id: 8, name: { en: 'Build your pizza' }, price: null, builds: [makeBuild()] })
}

function open(dish: Dish, session: Partial<AuthRestaurant> = {}) {
  const onClose = vi.fn()
  const onOpenBuilds = vi.fn()
  mock.onGet('/api/user').reply(200, { data: makeSessionUser({ languages: ['en'], ...session }) })
  mock.onPatch('/api/dishes/8').reply(200, { data: dish })
  renderWithProviders(
    <DishDialog
      open
      dish={dish}
      dishes={[]}
      categories={CATEGORIES}
      defaultCategoryId={null}
      currency="USD"
      secondCurrency={null}
      locale="en"
      onClose={onClose}
      onOpenCategories={vi.fn()}
      onOpenBuilds={onOpenBuilds}
      onOpenOffers={vi.fn()}
    />,
  )
  return { onClose, onOpenBuilds }
}

describe('a dish guests build, in the dish window', () => {
  beforeEach(() => {
    resetFactories()
    mock = new MockAdapter(api)
    resetCsrfToken(api)
    installCsrfInterceptor(api)
    mock.onGet('/api/csrf-token').reply(200, { token: 'csrf' })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    useUiStore.setState({ buildsDishId: null })
    mock.restore()
    api.interceptors.request.clear()
    api.interceptors.response.clear()
    resetCsrfToken(api)
  })

  it('says guests build it, with the way to Build your own showing its builds', async () => {
    const user = userEvent.setup()
    const { onClose, onOpenBuilds } = open(builtDish())

    expect(
      await screen.findByText('Guests build this dish. Edit how in Build your own.'),
    ).toBeInTheDocument()
    expect(screen.getByText("No dish price: the guest's build sets the price.")).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Open Build your own' }))

    expect(useUiStore.getState().buildsDishId).toBe(8)
    expect(onClose).toHaveBeenCalled()
    expect(onOpenBuilds).toHaveBeenCalled()
  })

  it('needs no price of its own, its variants extras, and never sends the builds', async () => {
    const user = userEvent.setup()
    open(builtDish())
    const region = await screen.findByRole('region', { name: 'Variants and add-ons' })

    await user.click(within(region).getByRole('button', { name: 'Size' }))
    expect(within(region).getByLabelText('Size, option 1, extra price')).toBeInTheDocument()
    // The build shows its own price, so no range beside it.
    expect(region).not.toHaveTextContent('Guests pay')
    await user.click(within(region).getByRole('button', { name: 'Add add-on' }))
    await user.type(within(region).getByLabelText('Add-on 1'), 'Olives')
    await user.click(screen.getByRole('button', { name: 'Save dish' }))

    await waitFor(() => expect(mock.history.patch).toHaveLength(1))
    expect(JSON.parse(mock.history.patch[0]!.data as string)).not.toHaveProperty('builds')
  })

  it('says nothing of builds while they are off, or on a dish without one', async () => {
    open(builtDish(), { plan: { ...FULL_PLAN, build_your_own: false } })
    await screen.findByRole('region', { name: 'Variants and add-ons' })
    expect(screen.queryByText(/Guests build this dish/)).not.toBeInTheDocument()
    expect(screen.getByText('Leave empty to hide the price.')).toBeInTheDocument()
  })
})
