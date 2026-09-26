import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { renderWithProviders } from '@/test/utils/render-with-providers'
import { SocialLinksPage } from './social-links-page'

let mock: MockAdapter

const instagram = { id: 1, platform: 'instagram', url: 'https://instagram.com/beit' }
const facebook = { id: 2, platform: 'facebook', url: 'https://facebook.com/beit' }

function stub(data: object[] = [instagram], used = data.length, limit: number | null = 2) {
  mock.onGet('/api/social-links').reply(200, { data, meta: { used, limit } })
}

describe('SocialLinksPage', () => {
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

  it('shows each link with where it points', async () => {
    stub([instagram, facebook], 2)
    renderWithProviders(<SocialLinksPage />)

    expect(await screen.findByText('Instagram')).toBeInTheDocument()
    expect(screen.getByText('Facebook')).toBeInTheDocument()

    // The address opens in a new tab: checking a link still works is the main
    // reason to come here.
    const link = screen.getByRole('link', { name: /instagram\.com\/beit/ })
    expect(link).toHaveAttribute('href', 'https://instagram.com/beit')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('offers an empty state when there are none', async () => {
    stub([], 0)
    renderWithProviders(<SocialLinksPage />)

    expect(await screen.findByText('No social links yet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add your first link' })).toBeEnabled()
  })

  it('shows plan usage and blocks adding at the limit', async () => {
    stub([instagram, facebook], 2, 2)
    renderWithProviders(<SocialLinksPage />)

    expect(await screen.findByText('2 / 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Add link$/ })).toBeDisabled()
    expect(screen.getByText(/every social link your plan allows/)).toBeInTheDocument()
  })

  it('adds a link through the API', async () => {
    stub([], 0)
    mock.onPost('/api/social-links').reply(201, { data: instagram })

    const user = userEvent.setup()
    renderWithProviders(<SocialLinksPage />)

    await user.click(await screen.findByRole('button', { name: 'Add your first link' }))

    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText(/^Link/), 'https://instagram.com/beit')
    await user.click(within(dialog).getByRole('button', { name: 'Add link' }))

    await waitFor(() => {
      const post = mock.history.post.find((r) => r.url === '/api/social-links')
      expect(post).toBeDefined()
      expect(JSON.parse(post!.data as string)).toEqual({
        platform: 'instagram',
        url: 'https://instagram.com/beit',
      })
    })
  })

  it('refuses an address that is not a link', async () => {
    stub([], 0)
    const user = userEvent.setup()
    renderWithProviders(<SocialLinksPage />)

    await user.click(await screen.findByRole('button', { name: 'Add your first link' }))

    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText(/^Link/), 'instagram.com/beit')
    await user.click(within(dialog).getByRole('button', { name: 'Add link' }))

    // Caught in the browser, so nothing is sent.
    expect(await screen.findByText(/Enter the full link/)).toBeInTheDocument()
    expect(mock.history.post.filter((r) => r.url === '/api/social-links')).toHaveLength(0)
  })

  it('does not offer a platform that already has a link', async () => {
    stub([instagram], 1, 4)
    const user = userEvent.setup()
    renderWithProviders(<SocialLinksPage />)

    await user.click(await screen.findByRole('button', { name: /^Add link$/ }))
    await user.click(screen.getByRole('combobox', { name: /Platform/ }))

    // One link per platform, so Instagram is off the list.
    const options = await screen.findAllByRole('option')
    const labels = options.map((option) => option.textContent)
    expect(labels).not.toContain('Instagram')
    expect(labels).toEqual(expect.arrayContaining(['X', 'Facebook', 'TikTok']))
  })

  it('edits a link, keeping its own platform on the list', async () => {
    stub([instagram], 1, 4)
    mock
      .onPatch('/api/social-links/1')
      .reply(200, { data: { ...instagram, url: 'https://instagram.com/new' } })

    const user = userEvent.setup()
    renderWithProviders(<SocialLinksPage />)

    await user.click(await screen.findByRole('button', { name: 'Edit Instagram link' }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('combobox', { name: /Platform/ })).toHaveValue('Instagram')

    const url = within(dialog).getByLabelText(/^Link/)
    await user.clear(url)
    await user.type(url, 'https://instagram.com/new')
    await user.click(within(dialog).getByRole('button', { name: 'Save link' }))

    await waitFor(() => {
      const patch = mock.history.patch.find((r) => r.url === '/api/social-links/1')
      expect(patch).toBeDefined()
      expect(JSON.parse(patch!.data as string)).toEqual({
        platform: 'instagram',
        url: 'https://instagram.com/new',
      })
    })
  })

  it('confirms before removing a link', async () => {
    stub([instagram], 1)
    mock.onDelete('/api/social-links/1').reply(204)

    const user = userEvent.setup()
    renderWithProviders(<SocialLinksPage />)

    await user.click(await screen.findByRole('button', { name: 'Remove Instagram link' }))
    expect(screen.getByText('Remove this link?')).toBeInTheDocument()
    expect(mock.history.delete).toHaveLength(0)

    await user.click(screen.getByRole('button', { name: 'Remove' }))

    await waitFor(() => expect(mock.history.delete).toHaveLength(1))
    expect(await screen.findByText('Link removed')).toBeInTheDocument()
  })

  it('says so when every platform is taken', async () => {
    stub(
      [
        instagram,
        facebook,
        { id: 3, platform: 'x', url: 'https://x.com/beit' },
        { id: 4, platform: 'tiktok', url: 'https://tiktok.com/@beit' },
      ],
      4,
      null,
    )
    renderWithProviders(<SocialLinksPage />)

    expect(await screen.findByText(/Every platform your menu can show/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Add link$/ })).toBeDisabled()
  })

  it('surfaces a failed load with a retry', async () => {
    mock.onGet('/api/social-links').reply(500, { message: 'Something went wrong.' })
    renderWithProviders(<SocialLinksPage />)

    expect(await screen.findByRole('button', { name: /Try again/ })).toBeInTheDocument()
  })
})
