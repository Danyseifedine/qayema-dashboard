import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { renderWithProviders } from '@/test/utils/render-with-providers'
import { TemplatesPage } from './templates-page'

let mock: MockAdapter

const classic = {
  id: 1,
  slug: 'classic',
  name: { en: 'Classic', ar: null },
  description: { en: 'A clean, simple menu.', ar: null },
  thumbnail_url: null,
  settings_schema: [],
}

const midnight = {
  ...classic,
  id: 2,
  slug: 'midnight',
  name: { en: 'Midnight', ar: null },
  description: { en: 'Dark and moody.', ar: null },
}

function stub(current: number | null) {
  mock.onGet('/api/templates').reply(200, {
    data: [classic, midnight],
    meta: { current, settings: {} },
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
    renderWithProviders(<TemplatesPage locale="en" />)

    expect(await screen.findByText('Your menu needs a design')).toBeInTheDocument()
  })

  it('offers every design for use, because designs are not sold', async () => {
    stub(null)
    renderWithProviders(<TemplatesPage locale="en" />)

    // Both designs are available: a package grants limits, never a look.
    const buttons = await screen.findAllByRole('button', { name: 'Use this design' })
    expect(buttons).toHaveLength(2)
    expect(screen.queryByText(/coins/i)).not.toBeInTheDocument()
  })

  it('selects a design in one tap, with no confirmation step', async () => {
    stub(null)
    mock
      .onPost('/api/templates/select')
      .reply(200, { data: [classic, midnight], meta: { current: 2, settings: {} } })

    const user = userEvent.setup()
    renderWithProviders(<TemplatesPage locale="en" />)

    const buttons = await screen.findAllByRole('button', { name: 'Use this design' })
    await user.click(buttons[1]!)

    await waitFor(() => {
      const post = mock.history.post.find((r) => r.url === '/api/templates/select')
      expect(post).toBeDefined()
      expect(JSON.parse(post!.data as string)).toEqual({ template_id: 2 })
    })

    // Once chosen it is marked in use and the lock notice goes away.
    expect(await screen.findByText('In use')).toBeInTheDocument()
    expect(screen.queryByText('Your menu needs a design')).not.toBeInTheDocument()
  })

  it('marks the design already in use and does not offer it again', async () => {
    stub(1)
    renderWithProviders(<TemplatesPage locale="en" />)

    expect(await screen.findByText('In use')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Currently in use' })).toBeDisabled()
    expect(screen.getAllByRole('button', { name: 'Use this design' })).toHaveLength(1)
  })

  it('shows the server message when a switch fails', async () => {
    stub(1)
    mock.onPost('/api/templates/select').reply(422, { message: 'That design is no longer active.' })

    const user = userEvent.setup()
    renderWithProviders(<TemplatesPage locale="en" />)

    await user.click(await screen.findByRole('button', { name: 'Use this design' }))

    // The hook also toasts, so scope the assertion to the inline notice.
    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText('Could not switch design')).toBeInTheDocument()
    expect(within(alert).getByText('That design is no longer active.')).toBeInTheDocument()
  })

  describe('menu colour', () => {
    const styled = {
      ...classic,
      settings_schema: [
        { key: 'primary_color', type: 'color', default: '#F8D38D' },
        { key: 'background_color', type: 'color', default: '#FFFFFF' },
      ],
    }

    function stubStyled(settings: Record<string, unknown>) {
      mock.onGet('/api/templates').reply(200, {
        data: [styled, midnight],
        meta: { current: 1, settings },
      })
    }

    it('is not offered before a design is chosen, or on a design with a fixed look', async () => {
      stub(1)
      renderWithProviders(<TemplatesPage locale="en" />)

      expect(await screen.findByText('In use')).toBeInTheDocument()
      expect(screen.queryByText('Menu colour')).not.toBeInTheDocument()
    })

    it('shows the colour the menu uses and saves a new one on its own', async () => {
      stubStyled({ primary_color: '#1F6FEB', background_color: '#FAF7F0' })
      mock.onPut('/api/template-settings').reply(200, {
        data: { settings: { primary_color: '#C0392B', background_color: '#FAF7F0' } },
      })

      const user = userEvent.setup()
      renderWithProviders(<TemplatesPage locale="en" />)

      const hex = await screen.findByRole('textbox', { name: 'Main colour' })
      expect(hex).toHaveValue('#1F6FEB')
      expect(screen.getByRole('button', { name: 'Save colour' })).toBeDisabled()

      await user.clear(hex)
      await user.type(hex, '#C0392B')
      await user.click(screen.getByRole('button', { name: 'Save colour' }))

      // Only the colour is sent: the server keeps every other setting.
      await waitFor(() => {
        const put = mock.history.put.find((r) => r.url === '/api/template-settings')
        expect(put).toBeDefined()
        expect(JSON.parse(put!.data as string)).toEqual({ settings: { primary_color: '#C0392B' } })
      })
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Save colour' })).toBeDisabled(),
      )
    })

    it('goes back to the design default in one tap', async () => {
      stubStyled({ primary_color: '#1F6FEB' })

      const user = userEvent.setup()
      renderWithProviders(<TemplatesPage locale="en" />)

      await user.click(await screen.findByRole('button', { name: 'Reset to Qayema gold' }))

      expect(screen.getByRole('textbox', { name: 'Main colour' })).toHaveValue('#F8D38D')
      expect(screen.getByRole('button', { name: 'Reset to Qayema gold' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Save colour' })).toBeEnabled()
    })
  })
})
