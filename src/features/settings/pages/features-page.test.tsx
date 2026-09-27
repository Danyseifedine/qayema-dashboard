import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { renderWithProviders } from '@/test/utils/render-with-providers'
import { FeaturesPage } from './features-page'

let mock: MockAdapter

const ALL = { qr_studio: true, ordering: true, advanced_analytics: true }

describe('FeaturesPage', () => {
  beforeEach(() => {
    mock = new MockAdapter(api)
    resetCsrfToken(api)
    installCsrfInterceptor(api)
    mock.onGet('/api/csrf-token').reply(200, { token: 'csrf' })
  })

  afterEach(() => {
    mock.restore()
    api.interceptors.request.clear()
    api.interceptors.response.clear()
    resetCsrfToken(api)
  })

  it('has a switch for each optional section, on while it shows', () => {
    renderWithProviders(<FeaturesPage hidden={['orders']} features={ALL} />)

    expect(screen.getByRole('switch', { name: 'Show Analytics' })).toBeChecked()
    expect(screen.getByRole('switch', { name: 'Show Orders' })).not.toBeChecked()
    expect(screen.getByRole('switch', { name: 'Show QR Studio' })).toBeChecked()
    expect(screen.getByRole('switch', { name: 'Show Social links' })).toBeChecked()
    // Core sections have no switch.
    expect(screen.queryByRole('switch', { name: 'Show Dishes' })).not.toBeInTheDocument()
  })

  it('saves the whole list when a section is switched off', async () => {
    mock.onPut('/api/sections').reply(200, { data: { hidden: ['orders', 'analytics'] } })
    const user = userEvent.setup()
    renderWithProviders(<FeaturesPage hidden={['orders']} features={ALL} />)

    await user.click(screen.getByRole('switch', { name: 'Show Analytics' }))

    await waitFor(() => expect(mock.history.put).toHaveLength(1))
    expect(JSON.parse(mock.history.put[0]!.data as string)).toEqual({
      hidden: ['orders', 'analytics'],
    })
  })

  it('switches a section back on', async () => {
    mock.onPut('/api/sections').reply(200, { data: { hidden: [] } })
    const user = userEvent.setup()
    renderWithProviders(<FeaturesPage hidden={['orders']} features={ALL} />)

    await user.click(screen.getByRole('switch', { name: 'Show Orders' }))

    await waitFor(() => expect(mock.history.put).toHaveLength(1))
    expect(JSON.parse(mock.history.put[0]!.data as string)).toEqual({ hidden: [] })
  })

  it('says hiding Orders does not stop guests ordering', () => {
    renderWithProviders(<FeaturesPage hidden={['orders']} features={ALL} />)

    expect(screen.getByText(/Guests can still order from your menu/)).toBeInTheDocument()
  })

  it('marks a section the package does not include', () => {
    renderWithProviders(<FeaturesPage hidden={[]} features={{ ...ALL, qr_studio: false }} />)

    expect(screen.getByText('Not on your package')).toBeInTheDocument()
  })
})
