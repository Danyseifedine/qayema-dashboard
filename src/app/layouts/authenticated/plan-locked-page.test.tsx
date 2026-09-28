import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { NAV_ITEMS, type NavItem } from '@/app/layouts/authenticated/nav-items'
import { PlanLockedPage } from '@/app/layouts/authenticated/plan-locked-page'
import { AnalyticsTeaser } from '@/features/analytics'
import { PACKAGE_CATALOGUE } from '@/test/factories/packages'
import { renderWithProviders } from '@/test/render-with-providers'

let mock: MockAdapter

const item = (key: string) => NAV_ITEMS.find((candidate) => candidate.key === key)!

describe('PlanLockedPage', () => {
  beforeEach(() => {
    mock = new MockAdapter(api)
    mock.onGet('/api/packages').reply(200, {
      data: PACKAGE_CATALOGUE,
      meta: { current: 'free', ends_at: null },
    })
  })

  afterEach(() => mock.restore())

  it('says what the section gives and which package has it', async () => {
    const onOpenPackage = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(
      <PlanLockedPage item={item('appearance')} locale="en" onOpenPackage={onOpenPackage} />,
    )

    expect(screen.getByRole('heading', { name: 'Appearance' })).toBeInTheDocument()
    expect(screen.getByText('Make the menu look like yours')).toBeInTheDocument()
    expect(screen.getByText('A font for each language on your menu')).toBeInTheDocument()
    expect(await screen.findByText(/Comes with the Pro package/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'See packages' }))
    expect(onOpenPackage).toHaveBeenCalledOnce()
  })

  it('points orders to the package that takes them', async () => {
    renderWithProviders(
      <PlanLockedPage item={item('orders')} locale="en" onOpenPackage={vi.fn()} />,
    )

    expect(await screen.findByText(/Comes with the Premium package/)).toBeInTheDocument()
  })

  it("shows analytics' one number: this week's views", async () => {
    mock.onGet('/api/analytics/teaser').reply(200, { data: { views: 212 } })
    renderWithProviders(
      <PlanLockedPage item={item('analytics')} locale="en" onOpenPackage={vi.fn()}>
        <AnalyticsTeaser locale="en" />
      </PlanLockedPage>,
    )

    expect(await screen.findByText('212 people opened your menu this week.')).toBeInTheDocument()
  })

  it('says the section is not on the package while no package is known to have it', () => {
    mock.onGet('/api/packages').reply(500)
    renderWithProviders(
      <PlanLockedPage item={item('appearance')} locale="en" onOpenPackage={vi.fn()} />,
    )

    expect(screen.getByText('Not on your package yet.')).toBeInTheDocument()
  })

  it('falls back to the section name for a section with no copy of its own', async () => {
    const qrStudio: NavItem = { ...item('qr'), requiresPlan: 'qr_studio' }
    renderWithProviders(<PlanLockedPage item={qrStudio} locale="en" onOpenPackage={vi.fn()} />)

    expect(screen.getAllByText('QR code')).toHaveLength(2)
    expect(await screen.findByText(/Comes with the Premium package/)).toBeInTheDocument()
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
  })
})
