import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '@/App'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { makeSessionUser } from '@/test/factories/session'
import { renderWithProviders } from '@/test/render-with-providers'

/**
 * The phone's More tab, in a file of its own: it is part of the shell, not a
 * lazy page, so App.test.tsx's page stand-ins do not cover it. Here it is a
 * stand-in too, showing what App hands it.
 */
vi.mock('@/app/layouts/authenticated/more-page', () => ({
  MorePage: ({
    hasTemplate,
    off,
    onOpen,
  }: {
    hasTemplate: boolean
    off: readonly string[]
    onOpen: (key: string) => void
  }) => (
    <section aria-label="more page">
      <p>{JSON.stringify({ hasTemplate, off })}</p>
      <button type="button" onClick={() => onOpen('account')}>
        Open account
      </button>
    </section>
  ),
}))
vi.mock('@/features/account/pages', () => ({
  AccountPage: () => <section aria-label="account page" />,
}))

let mock: MockAdapter

describe('App on the More tab', () => {
  beforeEach(() => {
    mock = new MockAdapter(api)
    resetCsrfToken(api)
    installCsrfInterceptor(api)
    mock.onGet('/api/csrf-token').reply(200, { token: 'csrf' })
    mock.onGet('/api/user').reply(200, { data: makeSessionUser({ switched_off: ['analytics'] }) })
    window.history.replaceState(null, '', '/more')
  })

  afterEach(() => {
    mock.restore()
    api.interceptors.request.clear()
    api.interceptors.response.clear()
    resetCsrfToken(api)
    window.history.replaceState(null, '', '/')
  })

  it("hands More the restaurant's sections, and opens the one chosen there", async () => {
    const user = userEvent.setup()
    renderWithProviders(<App />)

    const more = await screen.findByRole('region', { name: 'more page' })
    expect(more).toHaveTextContent('{"hasTemplate":true,"off":["analytics"]}')

    await user.click(within(more).getByRole('button', { name: 'Open account' }))
    expect(await screen.findByRole('region', { name: 'account page' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/account')
  })
})
