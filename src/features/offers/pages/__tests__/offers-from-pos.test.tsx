import { screen } from '@testing-library/react'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { makeOffer } from '@/test/factories/offers'
import { makeSessionUser } from '@/test/factories/session'
import { renderWithProviders } from '@/test/render-with-providers'
import { OffersPage } from '@/features/offers/pages/offers-page'

let mock: MockAdapter

const SLOTS = {
  banner: { used: 0, limit: 3 },
  popup: { used: 0, limit: 1 },
  ad: { used: 0, limit: 1 },
}

function stub(data: ReturnType<typeof makeOffer>[]) {
  mock.onGet('/api/offers').reply(200, {
    data,
    meta: { limit: 30, slots: SLOTS, timezone: 'Asia/Beirut', currency: 'USD', stats: {} },
  })
}

describe('Offers while the menu comes from a POS', () => {
  beforeEach(() => {
    mock = new MockAdapter(api)
    resetCsrfToken(api)
    installCsrfInterceptor(api)
    mock.onGet('/api/csrf-token').reply(200, { token: 'csrf' })
    mock.onGet('/api/user').reply(200, { data: makeSessionUser({ pos_connected: true }) })
    mock
      .onGet('/api/dishes')
      .reply(200, { data: [], meta: { used: 0, limit: 40, currency: 'USD' } })
  })

  afterEach(() => {
    mock.restore()
    api.interceptors.request.clear()
    api.interceptors.response.clear()
    resetCsrfToken(api)
  })

  it('says they are off and lists the saved ones without their actions', async () => {
    stub([makeOffer({ id: 1, title: { en: 'Happy hour' } })])
    renderWithProviders(<OffersPage locale="en" onOpenCategories={vi.fn()} />)

    expect(await screen.findByText('Happy hour')).toBeInTheDocument()
    expect(screen.getByText(/Off while your menu is connected to a POS/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'New offer' })).not.toBeInTheDocument()
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Edit / })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Happy hour/ })).toBeDisabled()
  })

  it('offers no first offer either', async () => {
    stub([])
    renderWithProviders(<OffersPage locale="en" onOpenCategories={vi.fn()} />)

    expect(await screen.findByText(/Off while your menu is connected to a POS/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /offer/i })).not.toBeInTheDocument()
  })
})
