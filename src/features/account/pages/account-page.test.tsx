import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { renderWithProviders } from '@/test/utils/render-with-providers'
import { AccountPage } from './account-page'

let mock: MockAdapter

function user(hasPassword: boolean) {
  return {
    id: 1,
    name: 'Dany',
    email: 'owner@example.com',
    role: 'menu_owner',
    has_completed_onboarding: true,
    has_password: hasPassword,
    restaurant: null,
  }
}

function stub(hasPassword = true) {
  mock.onGet('/api/user').reply(200, { data: user(hasPassword) })
}

describe('AccountPage', () => {
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

  it('shows the owner their name, with the email locked', async () => {
    stub()
    renderWithProviders(<AccountPage onOpenRestaurant={vi.fn()} />)

    expect(await screen.findByLabelText(/^Your name/)).toHaveValue('Dany')
    // The email is the identity, so it is text rather than an input.
    expect(screen.getByText('owner@example.com')).toBeInTheDocument()
    expect(screen.queryByLabelText(/^Email/)).not.toBeInTheDocument()
  })

  it('offers a way across when the owner wanted the restaurant name', async () => {
    stub()
    const onOpenRestaurant = vi.fn()
    const owner = userEvent.setup()
    renderWithProviders(<AccountPage onOpenRestaurant={onOpenRestaurant} />)

    await owner.click(await screen.findByRole('button', { name: 'Edit your restaurant instead' }))
    expect(onOpenRestaurant).toHaveBeenCalledOnce()
  })

  it('saves a new name', async () => {
    stub()
    mock.onPatch('/api/account').reply(200, { data: { ...user(true), name: 'Dany S' } })

    const owner = userEvent.setup()
    renderWithProviders(<AccountPage onOpenRestaurant={vi.fn()} />)

    await owner.type(await screen.findByLabelText(/^Your name/), ' S')
    await owner.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      const patch = mock.history.patch.find((r) => r.url === '/api/account')
      expect(patch).toBeDefined()
      expect(JSON.parse(patch!.data as string)).toEqual({ name: 'Dany S' })
    })
    expect(await screen.findByText('Profile saved')).toBeInTheDocument()
  })

  it('asks for the current password when there is one', async () => {
    stub(true)
    renderWithProviders(<AccountPage onOpenRestaurant={vi.fn()} />)

    expect(await screen.findByLabelText(/^Current password/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Change password' })).toBeInTheDocument()
  })

  it('asks for no current password on a Google-only account', async () => {
    stub(false)
    renderWithProviders(<AccountPage onOpenRestaurant={vi.fn()} />)

    expect(await screen.findByText('Set a password')).toBeInTheDocument()
    expect(screen.queryByLabelText(/^Current password/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Set password' })).toBeInTheDocument()
  })

  it('refuses two passwords that do not match, without asking the server', async () => {
    stub(true)
    const owner = userEvent.setup()
    renderWithProviders(<AccountPage onOpenRestaurant={vi.fn()} />)

    await owner.type(await screen.findByLabelText(/^Current password/), 'old-password')
    await owner.type(screen.getByLabelText(/^New password/), 'a-long-new-one')
    await owner.type(screen.getByLabelText(/^Confirm password/), 'a-different-one')
    await owner.click(screen.getByRole('button', { name: 'Change password' }))

    expect(await screen.findByText('The two passwords do not match.')).toBeInTheDocument()
    expect(mock.history.put).toHaveLength(0)
  })

  it('changes the password and clears the fields afterwards', async () => {
    stub(true)
    mock.onPut('/api/password').reply(200, { message: 'Done.', has_password: true })

    const owner = userEvent.setup()
    renderWithProviders(<AccountPage onOpenRestaurant={vi.fn()} />)

    await owner.type(await screen.findByLabelText(/^Current password/), 'old-password')
    await owner.type(screen.getByLabelText(/^New password/), 'a-long-new-one')
    await owner.type(screen.getByLabelText(/^Confirm password/), 'a-long-new-one')
    await owner.click(screen.getByRole('button', { name: 'Change password' }))

    await waitFor(() => {
      const put = mock.history.put.find((r) => r.url === '/api/password')
      expect(put).toBeDefined()
      expect(JSON.parse(put!.data as string)).toEqual({
        current_password: 'old-password',
        password: 'a-long-new-one',
        password_confirmation: 'a-long-new-one',
      })
    })

    // A typed password must never be left sitting in the form.
    await waitFor(() => expect(screen.getByLabelText(/^New password/)).toHaveValue(''))
    expect(screen.getByLabelText(/^Current password/)).toHaveValue('')
  })

  it('reports a wrong current password on its own field', async () => {
    stub(true)
    mock.onPut('/api/password').reply(422, {
      message: 'The given data was invalid.',
      code: 'validation_failed',
      errors: { current_password: ['The current password is incorrect.'] },
    })

    const owner = userEvent.setup()
    renderWithProviders(<AccountPage onOpenRestaurant={vi.fn()} />)

    await owner.type(await screen.findByLabelText(/^Current password/), 'wrong-password')
    await owner.type(screen.getByLabelText(/^New password/), 'a-long-new-one')
    await owner.type(screen.getByLabelText(/^Confirm password/), 'a-long-new-one')
    await owner.click(screen.getByRole('button', { name: 'Change password' }))

    expect(await screen.findByText('The current password is incorrect.')).toBeInTheDocument()
  })
})
