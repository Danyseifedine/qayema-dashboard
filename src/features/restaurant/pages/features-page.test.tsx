import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { renderWithProviders } from '@/test/utils/render-with-providers'
import { FeaturesPage, type FeaturesPageProps } from '@/features/restaurant/pages/features-page'

let mock: MockAdapter

const ALL = { qr_studio: true, ordering: true, advanced_analytics: true }

function page(props: Partial<FeaturesPageProps> = {}) {
  return <FeaturesPage off={[]} plan={ALL} secondLocale="ar" defaultLocale="en" {...props} />
}

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

  it('has a switch for orders, the QR studio, analytics and multiple languages', () => {
    renderWithProviders(page({ off: ['orders'] }))

    const switches = screen
      .getAllByRole('switch')
      .map((element) => element.getAttribute('aria-label'))
    expect(switches).toEqual(['Orders on', 'QR Studio on', 'Analytics on', 'Multiple languages on'])
    expect(screen.getByRole('switch', { name: 'Orders on' })).not.toBeChecked()
    expect(screen.getByRole('switch', { name: 'Analytics on' })).toBeChecked()
  })

  it('saves the whole list when a feature is switched off', async () => {
    mock.onPut('/api/features').reply(200, { data: { off: ['orders', 'analytics'] } })
    const user = userEvent.setup()
    renderWithProviders(page({ off: ['orders'] }))

    await user.click(screen.getByRole('switch', { name: 'Analytics on' }))

    await waitFor(() => expect(mock.history.put).toHaveLength(1))
    expect(JSON.parse(mock.history.put[0]!.data as string)).toEqual({
      off: ['orders', 'analytics'],
    })
  })

  it('says what switching orders and the QR studio off means', () => {
    renderWithProviders(page({ off: ['orders', 'qr'] }))

    expect(screen.getByText(/Guests can't order from your menu/)).toBeInTheDocument()
    expect(screen.getByText(/plain black QR code stays/)).toBeInTheDocument()
  })

  it('chooses the second language inside the languages row', async () => {
    mock.onPut('/api/menu-languages').reply(200, {
      data: { languages: ['en', 'fr'], second_locale: 'fr', default_locale: 'en' },
    })
    const user = userEvent.setup()
    renderWithProviders(page())

    await user.click(screen.getByRole('combobox', { name: /Second language/ }))
    await user.click(await screen.findByRole('option', { name: /French/ }))

    await waitFor(() => expect(mock.history.put).toHaveLength(1))
    expect(JSON.parse(mock.history.put[0]!.data as string)).toEqual({
      second_locale: 'fr',
      default_locale: 'en',
    })
  })

  it('sets which language the menu opens in', async () => {
    mock.onPut('/api/menu-languages').reply(200, {
      data: { languages: ['en', 'ar'], second_locale: 'ar', default_locale: 'ar' },
    })
    const user = userEvent.setup()
    renderWithProviders(page())

    await user.click(screen.getByRole('tab', { name: 'Arabic' }))

    await waitFor(() => expect(mock.history.put).toHaveLength(1))
    expect(JSON.parse(mock.history.put[0]!.data as string)).toEqual({
      second_locale: 'ar',
      default_locale: 'ar',
    })
  })

  it('hides the language choice while multiple languages are off', () => {
    renderWithProviders(page({ off: ['languages'] }))

    expect(screen.queryByRole('combobox', { name: /Second language/ })).not.toBeInTheDocument()
    expect(screen.getByText(/Your menu shows English only/)).toBeInTheDocument()
  })

  it('marks a feature the package does not include', () => {
    renderWithProviders(page({ plan: { ...ALL, qr_studio: false } }))

    expect(screen.getByText('Not on your package')).toBeInTheDocument()
  })
})
