import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { renderWithProviders } from '@/test/render-with-providers'
import { PACKAGE_CATALOGUE } from '@/test/factories/packages'
import { EMPTY_PLAN, makeSessionUser } from '@/test/factories/session'
import { StudioLocked } from '@/features/qr/components/studio/studio-locked'

let mock: MockAdapter

describe('StudioLocked', () => {
  beforeEach(() => {
    mock = new MockAdapter(api)
  })

  afterEach(() => {
    mock.restore()
  })

  it('says what the studio adds, names the package that has it and opens Packages', async () => {
    mock.onGet('/api/packages').reply(200, {
      data: PACKAGE_CATALOGUE,
      meta: { current: 'free', ends_at: null },
    })
    const onOpenPackage = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<StudioLocked locale="en" onOpenPackage={onOpenPackage} />)

    expect(
      await screen.findByRole('heading', { name: 'QR Studio comes with Premium' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Simple mode active')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'See packages' }))
    expect(onOpenPackage).toHaveBeenCalledOnce()
  })

  it('says the studio is turned off when the admin turned it off', async () => {
    mock.onGet('/api/user').reply(200, {
      data: makeSessionUser({ plan: EMPTY_PLAN, turned_off: ['qr_studio'] }),
    })
    mock.onGet('/api/packages').reply(200, {
      data: PACKAGE_CATALOGUE,
      meta: { current: 'premium' },
    })
    renderWithProviders(<StudioLocked locale="en" onOpenPackage={vi.fn()} />)

    expect(await screen.findByText('Turned off for your restaurant')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /QR Studio/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'See packages' })).not.toBeInTheDocument()
  })

  it('shows the studio lock without a package name when none has the studio', async () => {
    mock.onGet('/api/packages').reply(500, { message: 'Server down', code: 'server_error' })
    renderWithProviders(<StudioLocked locale="en" onOpenPackage={vi.fn()} />)

    expect(
      await screen.findByRole('heading', { name: 'QR Studio is not on your package' }),
    ).toBeInTheDocument()
    // The packages request has had its answer.
    await waitFor(() =>
      expect(mock.history.get.filter((request) => request.url === '/api/packages')).toHaveLength(1),
    )
    expect(screen.queryByText(/Premium/)).not.toBeInTheDocument()
  })
})
