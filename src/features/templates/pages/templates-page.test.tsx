import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { renderWithProviders } from '@/test/utils/render-with-providers'
import { TemplatesPage } from './templates-page'

let mock: MockAdapter

const free = {
  id: 1,
  slug: 'classic',
  price: 0,
  is_free: true,
  owned: true,
  name: { en: 'Classic', ar: null },
  description: { en: 'A clean, simple menu.', ar: null },
  thumbnail_url: null,
  settings_schema: [],
}

const paid = {
  ...free,
  id: 2,
  slug: 'midnight',
  price: 650,
  is_free: false,
  owned: false,
  name: { en: 'Midnight', ar: null },
  description: { en: 'Dark and moody.', ar: null },
}

function stub(current: number | null, balance = 100) {
  mock.onGet('/api/templates').reply(200, {
    data: [free, paid],
    meta: { current, settings: {}, balance },
  })
}

describe('TemplatesPage', () => {
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

  it('explains why the rest of the dashboard is locked when no design is chosen', async () => {
    stub(null)
    renderWithProviders(<TemplatesPage locale="en" onOpenWallet={vi.fn()} />)

    expect(await screen.findByText('Your menu needs a design')).toBeInTheDocument()
  })

  it('offers a free design for use and a paid one for unlocking', async () => {
    stub(null)
    renderWithProviders(<TemplatesPage locale="en" onOpenWallet={vi.fn()} />)

    expect(await screen.findByRole('button', { name: 'Use this design' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Unlock for 650 coins/ })).toBeInTheDocument()
  })

  it('selects a design without spending coins', async () => {
    stub(null)
    mock
      .onPost('/api/templates/select')
      .reply(200, { data: [free, paid], meta: { current: 1, settings: {}, balance: 100 } })

    const user = userEvent.setup()
    renderWithProviders(<TemplatesPage locale="en" onOpenWallet={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'Use this design' }))

    await waitFor(() => {
      const post = mock.history.post.find((r) => r.url === '/api/templates/select')
      expect(post).toBeDefined()
      expect(JSON.parse(post!.data as string)).toEqual({ template_id: 1 })
    })

    // Once chosen it is marked in use and the lock notice goes away.
    expect(await screen.findByText('In use')).toBeInTheDocument()
    expect(screen.queryByText('Your menu needs a design')).not.toBeInTheDocument()
  })

  it('asks for confirmation before spending coins on a paid design', async () => {
    stub(null, 900)
    const user = userEvent.setup()
    renderWithProviders(<TemplatesPage locale="en" onOpenWallet={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: /Unlock for 650 coins/ }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Unlock this design?')).toBeInTheDocument()
    expect(within(dialog).getByText(/spends 650 coins/)).toBeInTheDocument()

    // Nothing is spent until the owner confirms.
    expect(mock.history.post.filter((r) => r.url === '/api/templates/unlock')).toHaveLength(0)
  })

  it('turns a 402 into a shortfall prompt that leads to the wallet', async () => {
    stub(null, 100)
    mock.onPost('/api/templates/unlock').reply(402, {
      message: 'You do not have enough coins.',
      balance: 100,
      needed: 650,
      shortfall: 550,
    })

    const onOpenWallet = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<TemplatesPage locale="en" onOpenWallet={onOpenWallet} />)

    await user.click(await screen.findByRole('button', { name: /Unlock for 650 coins/ }))
    await user.click(screen.getByRole('button', { name: 'Unlock' }))

    const prompt = await screen.findByRole('button', { name: /Get 550 more coins/ })
    await user.click(prompt)

    expect(onOpenWallet).toHaveBeenCalledOnce()
  })
})
