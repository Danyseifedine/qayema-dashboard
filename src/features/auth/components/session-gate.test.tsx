import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { safeRedirect } from '@/lib/security/safe-redirect'
import { SessionGate } from '@/features/auth/components/session-gate'
import { makeSessionUser } from '@/test/mocks/factories/session'
import { renderWithProviders } from '@/test/utils/render-with-providers'

vi.mock('@/lib/security/safe-redirect', () => ({ safeRedirect: vi.fn(() => true) }))

let mock: MockAdapter

const dashboard = vi.fn((user: { name: string }) => <p>Dashboard for {user.name}</p>)

describe('SessionGate', () => {
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
    vi.mocked(safeRedirect).mockClear()
    dashboard.mockClear()
  })

  it('waits while the session is checked, then hands the owner to the dashboard', async () => {
    mock.onGet('/api/user').reply(200, { data: makeSessionUser() })
    renderWithProviders(<SessionGate>{dashboard}</SessionGate>)

    expect(screen.getByText('Checking your session…')).toBeInTheDocument()
    expect(await screen.findByText('Dashboard for Dany')).toBeInTheDocument()
    expect(dashboard).toHaveBeenCalledWith(expect.objectContaining({ email: 'owner@example.com' }))
  })

  it('says it is leaving for sign-in on a 401, with nothing to retry', async () => {
    mock.onGet('/api/user').reply(401, { message: 'Unauthenticated.' })
    renderWithProviders(<SessionGate>{dashboard}</SessionGate>)

    expect(await screen.findByText('Taking you to sign in')).toBeInTheDocument()
    expect(screen.getByText('One moment…')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
    expect(dashboard).not.toHaveBeenCalled()
  })

  it('shows any other failure with a retry that asks again', async () => {
    mock.onGet('/api/user').replyOnce(500, { message: 'Database is down' })
    mock.onGet('/api/user').replyOnce(200, { data: makeSessionUser() })
    const user = userEvent.setup()
    renderWithProviders(<SessionGate>{dashboard}</SessionGate>)

    expect(await screen.findByText('We could not load your account')).toBeInTheDocument()
    expect(screen.getByText('Database is down')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Dashboard for Dany')).toBeInTheDocument()
  })

  it('fails with a readable error when the session does not match its schema', async () => {
    mock.onGet('/api/user').reply(200, { data: { id: 'nope' } })
    renderWithProviders(<SessionGate>{dashboard}</SessionGate>)

    expect(await screen.findByText('The server sent an unexpected response.')).toBeInTheDocument()
  })

  it('sends an owner who has not finished onboarding back to the wizard', async () => {
    mock
      .onGet('/api/user')
      .reply(200, { data: { ...makeSessionUser(), has_completed_onboarding: false } })
    const user = userEvent.setup()
    renderWithProviders(<SessionGate>{dashboard}</SessionGate>)

    expect(await screen.findByText("Let's finish setting up")).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Continue setup' }))

    expect(safeRedirect).toHaveBeenCalledWith('https://qayema.test/onboarding')
    expect(dashboard).not.toHaveBeenCalled()
  })

  it('treats an owner with no restaurant yet as unfinished', async () => {
    mock.onGet('/api/user').reply(200, { data: { ...makeSessionUser(), restaurant: null } })
    renderWithProviders(<SessionGate>{dashboard}</SessionGate>)

    expect(await screen.findByRole('button', { name: 'Continue setup' })).toBeInTheDocument()
    expect(dashboard).not.toHaveBeenCalled()
  })
})
