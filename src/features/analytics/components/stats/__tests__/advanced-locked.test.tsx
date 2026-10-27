import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { PACKAGE_CATALOGUE } from '@/test/factories/packages'
import { EMPTY_PLAN, makeSessionUser } from '@/test/factories/session'
import { renderWithProviders } from '@/test/render-with-providers'
import { AdvancedLocked } from '@/features/analytics/components/stats/advanced-locked'

let mock: MockAdapter

describe('AdvancedLocked', () => {
  beforeEach(() => {
    mock = new MockAdapter(api)
    mock.onGet('/api/packages').reply(200, { data: PACKAGE_CATALOGUE, meta: { current: 'pro' } })
  })

  afterEach(() => mock.restore())

  it('says what advanced analytics add and opens the packages', async () => {
    const onOpenPackage = vi.fn()
    renderWithProviders(<AdvancedLocked locale="en" onOpenPackage={onOpenPackage} />)

    expect(screen.getByText('Advanced analytics')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'See packages' }))
    expect(onOpenPackage).toHaveBeenCalledOnce()
  })

  it('says they are turned off when the admin turned them off', async () => {
    mock.onGet('/api/user').reply(200, {
      data: makeSessionUser({ plan: EMPTY_PLAN, turned_off: ['advanced_analytics'] }),
    })
    renderWithProviders(<AdvancedLocked locale="en" onOpenPackage={vi.fn()} />)

    expect(await screen.findByText('Turned off for your restaurant')).toBeInTheDocument()
    expect(screen.queryByText('Advanced analytics')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'See packages' })).not.toBeInTheDocument()
  })
})
