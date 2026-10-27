import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/render-with-providers'
import { EMPTY_PLAN, FULL_PLAN } from '@/test/factories/session'
import { NAV_GROUPS } from '@/app/layouts/authenticated/nav-items'
import { MorePage } from '@/app/layouts/authenticated/more-page'

function renderMore({
  hasTemplate = true,
  plan = FULL_PLAN,
  off = [] as string[],
  onOpen = vi.fn(),
} = {}) {
  renderWithProviders(<MorePage hasTemplate={hasTemplate} plan={plan} off={off} onOpen={onOpen} />)
  return screen.getByRole('navigation', { name: 'Dashboard' })
}

describe('MorePage', () => {
  it('lists every section but Home, with what each is for', () => {
    const nav = renderMore()

    expect(within(nav).queryByRole('button', { name: 'Overview' })).not.toBeInTheDocument()
    expect(within(nav).getByRole('button', { name: 'Appearance' })).toHaveAccessibleDescription(
      'Colours and fonts',
    )
    // The two kinds of order, each saying which it is.
    expect(
      within(nav).getByRole('button', { name: 'Delivery and pickup' }),
    ).toHaveAccessibleDescription('Orders guests place from home')
    expect(within(nav).getByRole('button', { name: 'Table orders' })).toHaveAccessibleDescription(
      'Orders guests place at their table',
    )
    for (const name of ['Analytics', 'Categories', 'Dishes', 'Design', 'QR code', 'Package']) {
      expect(within(nav).getByRole('button', { name })).toBeEnabled()
    }
  })

  it('groups the sections: the menu, the look, sharing, orders, insights, settings', () => {
    const nav = renderMore()
    const inGroup = (heading: string) =>
      within(within(nav).getByRole('heading', { name: heading }).parentElement!)
        .getAllByRole('button')
        .map((button) => button.getAttribute('aria-label'))

    expect(
      within(nav)
        .getAllByRole('heading', { level: 2 })
        .map((h) => h.textContent),
    ).toEqual(['Menu', 'Look', 'Sharing', 'Orders', 'Insights', 'Settings'])
    expect(inGroup('Menu')).toEqual(['Categories', 'Dishes', 'Offers', 'Build your own'])
    expect(inGroup('Sharing')).toEqual(['QR code', 'Social links'])
    expect(inGroup('Orders')).toEqual(['Delivery and pickup', 'Table orders', 'Tables'])
  })

  it('has a card for every section the sidebar has, but Home', () => {
    const nav = renderMore()

    expect(within(nav).getAllByRole('button')).toHaveLength(
      NAV_GROUPS.flatMap((group) => group.items).filter((item) => item.key !== 'overview').length,
    )
  })

  it('drops a heading with nothing left under it', () => {
    // Without either kind of order, the tables go too, and so does the heading.
    const nav = renderMore({ off: ['orders', 'dine_in'] })

    expect(within(nav).queryByRole('heading', { name: 'Orders' })).not.toBeInTheDocument()
  })

  it('opens a section, and the account', async () => {
    const onOpen = vi.fn()
    const user = userEvent.setup()
    const nav = renderMore({ onOpen })

    await user.click(within(nav).getByRole('button', { name: 'Restaurant' }))
    expect(onOpen).toHaveBeenLastCalledWith('restaurant')
    await user.click(screen.getByRole('button', { name: 'Account' }))
    expect(onOpen).toHaveBeenLastCalledWith('account')
  })

  it('locks what waits for a design, and leaves out what the package or the owner left out', () => {
    const nav = renderMore({ hasTemplate: false, plan: EMPTY_PLAN })

    expect(within(nav).getByRole('button', { name: 'Categories' })).toBeDisabled()
    expect(within(nav).getByRole('button', { name: 'Categories' })).toHaveAccessibleDescription(
      'Pick a design first',
    )
    expect(within(nav).getByRole('button', { name: 'Design' })).toBeEnabled()
    for (const name of ['Analytics', 'Appearance', 'Tables']) {
      expect(within(nav).queryByRole('button', { name })).not.toBeInTheDocument()
    }
  })
})
