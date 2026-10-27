import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { makePackage, PACKAGE_CATALOGUE } from '@/test/factories/packages'
import { renderWithProviders } from '@/test/render-with-providers'
import { TurnedOffNotice } from '@/features/package/components/request/turned-off-notice'

let mock: MockAdapter

function catalogue(current: string | null, data = PACKAGE_CATALOGUE) {
  mock.onGet('/api/packages').reply(200, { data, meta: { current } })
}

/** Opens the dialog and sends the note as it opened, returning what was sent. */
async function askBack() {
  mock.onPost('/api/packages/request').reply(201)
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'Contact us' }))
  // The form loads on demand, once asked for.
  await user.click(await screen.findByRole('button', { name: 'Send request' }))
  await waitFor(() => expect(mock.history.post).toHaveLength(1))
  return JSON.parse(mock.history.post[0]!.data as string) as { package: string; message: string }
}

describe('TurnedOffNotice', () => {
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

  it('says Qayema turned it off, with no way to the packages', async () => {
    catalogue('pro')
    renderWithProviders(<TurnedOffNotice flag="analytics" locale="en" />)

    expect(screen.getByText('Turned off for your restaurant')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Qayema turned this off for your restaurant. Contact us if you need it back.',
      ),
    ).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Contact us' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'See packages' })).not.toBeInTheDocument()
  })

  it('asks for it back about the package the restaurant is on, with a note naming it', async () => {
    catalogue('pro')
    renderWithProviders(<TurnedOffNotice flag="analytics" locale="en" />)

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Contact us' }))
    expect(await screen.findByText('Ask us to turn it back on')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toHaveValue(
      'Please turn analytics back on for my restaurant.',
    )
    await userEvent.setup().click(screen.getByRole('button', { name: 'Cancel' }))

    expect(await askBack()).toEqual({
      package: 'pro',
      message: 'Please turn analytics back on for my restaurant.',
    })
  })

  it('asks for a feature no package has to be turned on', async () => {
    catalogue('free')
    renderWithProviders(<TurnedOffNotice flag="build_your_own" locale="en" ask="on" />)

    expect(screen.getByText('Ask us to turn it on')).toBeInTheDocument()
    expect(screen.getByText(/No package includes this/)).toBeInTheDocument()
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Ask us' }))
    expect(await screen.findByRole('dialog', { name: 'Ask us to turn it on' })).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toHaveValue(
      'Please turn build your own (half and half pizzas, scoops) on for my restaurant.',
    )
  })

  it('names the first package with the feature when the restaurant is on the default one', async () => {
    catalogue('free')
    renderWithProviders(<TurnedOffNotice flag="qr_studio" locale="en" />)

    expect((await askBack()).package).toBe('premium')
  })

  it('names any package that can be asked for when none has the feature', async () => {
    catalogue('free', [makePackage(), makePackage({ id: 9, slug: 'gold', is_default: false })])
    renderWithProviders(<TurnedOffNotice flag="qr_studio" locale="en" />)

    expect((await askBack()).package).toBe('gold')
  })

  it('offers no button while there is no package to send the message about', async () => {
    catalogue('free', [makePackage()])
    renderWithProviders(<TurnedOffNotice flag="analytics" locale="en" />)

    await waitFor(() => expect(mock.history.get.some((r) => r.url === '/api/packages')).toBe(true))
    expect(screen.getByText('Turned off for your restaurant')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Contact us' })).not.toBeInTheDocument()
  })
})
