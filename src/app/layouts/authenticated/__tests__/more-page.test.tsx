import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/render-with-providers'
import { EMPTY_PLAN, FULL_PLAN } from '@/test/factories/session'
import { phoneTabs } from '@/app/layouts/authenticated/nav-items'
import { MorePage } from '@/app/layouts/authenticated/more-page'

function renderMore({
  hasTemplate = true,
  plan = FULL_PLAN,
  off = [] as string[],
  onOpen = vi.fn(),
} = {}) {
  renderWithProviders(
    <MorePage
      tabs={phoneTabs({ hasTemplate, plan }, off)}
      hasTemplate={hasTemplate}
      plan={plan}
      off={off}
      onOpen={onOpen}
    />,
  )
  return screen.getByRole('navigation', { name: 'Dashboard' })
}

describe('MorePage', () => {
  it('lists every section that is not a tab, with what each is for', () => {
    const nav = renderMore()

    for (const tab of ['Overview', 'Dishes', 'Orders']) {
      expect(within(nav).queryByRole('button', { name: tab })).not.toBeInTheDocument()
    }
    expect(within(nav).getByRole('button', { name: 'Appearance' })).toHaveAccessibleDescription(
      'Colours and fonts',
    )
    for (const name of [
      'Analytics',
      'Categories',
      'Table orders',
      'Design',
      'QR code',
      'Package',
    ]) {
      expect(within(nav).getByRole('button', { name })).toBeEnabled()
    }
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

  it('shows the orders here once the analytics have their tab', () => {
    const nav = renderMore({ off: ['orders', 'dine_in'] })

    expect(within(nav).queryByRole('button', { name: 'Analytics' })).not.toBeInTheDocument()
    expect(within(nav).queryByRole('button', { name: 'Orders' })).not.toBeInTheDocument()
  })
})
