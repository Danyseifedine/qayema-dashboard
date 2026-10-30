import { screen } from '@testing-library/react'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { api } from '@/lib/api/client'
import { makeSessionUser } from '@/test/factories/session'
import { renderWithProviders } from '@/test/render-with-providers'
import { BuildYourOwnPage } from '@/features/build-your-own/pages/build-your-own-page'

let mock: MockAdapter

describe('Build your own while the menu comes from a POS', () => {
  beforeEach(() => {
    mock = new MockAdapter(api)
    mock.onGet('/api/user').reply(200, { data: makeSessionUser({ pos_connected: true }) })
    mock
      .onGet('/api/dishes')
      .reply(200, { data: [], meta: { used: 0, limit: 40, currency: 'USD' } })
    mock.onGet('/api/categories').reply(200, { data: [], meta: { used: 0, limit: 10 } })
  })

  afterEach(() => mock.restore())

  it('says it is off, and offers no new build', async () => {
    renderWithProviders(<BuildYourOwnPage locale="en" />)

    expect(await screen.findByText(/Off while your menu is connected to a POS/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /build/i })).not.toBeInTheDocument()
  })
})
