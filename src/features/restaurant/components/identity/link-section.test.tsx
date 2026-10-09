import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { renderWithProviders } from '@/test/render-with-providers'
import { LinkSection } from '@/features/restaurant/components/identity/link-section'

let mock: MockAdapter

/** The restaurant as the server sends it back after the link moved. */
const saved = {
  languages: ['en'],
  second_locale: null,
  default_locale: 'en',
  name: { en: 'Beit Qayema' },
  description: { en: null },
  slug: 'cedar-and-salt',
  google_maps_url: null,
  phone: null,
  country_code: null,
  currency: 'USD',
  timezone: 'Asia/Beirut',
  opening_hours: { mon: null, tue: null, wed: null, thu: null, fri: null, sat: null, sun: null },
  logo_url: null,
  cover_url: null,
}

const field = () => screen.getByRole('textbox', { name: 'Link' })
const changeButton = () => screen.getByRole('button', { name: 'Change link' })
const slugPuts = () => mock.history.put.filter((request) => request.url === '/api/restaurant/slug')

function renderSection(publicUrl: string | null = 'https://menu.qayema.test/beit-qayema') {
  return renderWithProviders(<LinkSection slug="beit-qayema" publicUrl={publicUrl} />)
}

describe('LinkSection', () => {
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

  it("shows the link after the menu's own host, and nothing to change until it differs", () => {
    renderSection()

    expect(screen.getByText('menu.qayema.test/')).toBeInTheDocument()
    expect(field()).toHaveValue('beit-qayema')
    expect(changeButton()).toBeDisabled()
  })

  it('shows only a slash before the link while the menu has no address yet', () => {
    renderSection(null)

    expect(screen.getByText('/')).toBeInTheDocument()
    expect(screen.queryByText(/qayema\.test/)).not.toBeInTheDocument()
  })

  it('asks for at least two characters, without asking to confirm', async () => {
    const user = userEvent.setup()
    renderSection()

    await user.clear(field())
    await user.type(field(), 'a')
    await user.click(changeButton())

    expect(await screen.findByText('Use at least 2 letters or numbers.')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(slugPuts()).toHaveLength(0)
  })

  it('keeps the link under a hundred characters', async () => {
    const user = userEvent.setup()
    renderSection()

    await user.clear(field())
    await user.paste('a'.repeat(101))
    await user.click(changeButton())

    expect(await screen.findByText('Keep the link under 100 characters.')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('changes nothing when the owner thinks better of it', async () => {
    const user = userEvent.setup()
    renderSection()

    await user.clear(field())
    await user.type(field(), 'cedar-and-salt')
    await user.click(changeButton())
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(slugPuts()).toHaveLength(0)
    expect(field()).toHaveValue('cedar-and-salt')
  })

  it('sends the trimmed link once confirmed, naming where the menu moves', async () => {
    mock.onPut('/api/restaurant/slug').reply(200, { data: saved })
    const user = userEvent.setup()
    renderSection()

    await user.clear(field())
    await user.type(field(), '  cedar-and-salt ')
    await user.click(changeButton())
    const dialog = await screen.findByRole('dialog')
    expect(
      within(dialog).getByText(/Your menu moves to menu\.qayema\.test\/cedar-and-salt\./),
    ).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Change link' }))

    await waitFor(() => expect(slugPuts()).toHaveLength(1))
    expect(JSON.parse(slugPuts()[0]!.data as string)).toEqual({ slug: 'cedar-and-salt' })
    expect(await screen.findByText('Link changed')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('says why under the field when the server refuses the link', async () => {
    mock.onPut('/api/restaurant/slug').reply(422, {
      message: 'That link is already taken. Try another one.',
      code: 'validation_failed',
      errors: { slug: ['That link is already taken. Try another one.'] },
    })
    const user = userEvent.setup()
    renderSection()

    await user.clear(field())
    await user.type(field(), 'olive')
    await user.click(changeButton())
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Change link' }),
    )

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(
      await screen.findAllByText('That link is already taken. Try another one.'),
    ).not.toHaveLength(0)
    expect(field()).toHaveValue('olive')
  })

  it('starts again from a link changed elsewhere', () => {
    const { rerender } = renderSection()

    rerender(
      <LinkSection slug="cedar-and-salt" publicUrl="https://menu.qayema.test/cedar-and-salt" />,
    )

    expect(field()).toHaveValue('cedar-and-salt')
    expect(changeButton()).toBeDisabled()
  })
})
