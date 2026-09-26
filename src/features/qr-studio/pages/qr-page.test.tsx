import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { renderWithProviders } from '@/test/utils/render-with-providers'
import { QrPage } from './qr-page'

/**
 * The drawing library needs a real canvas, which jsdom does not have. The
 * fake records what it was asked to draw and download, which is what these
 * tests care about: the options going in, not the pixels coming out.
 */
const drawn = vi.hoisted(() => ({
  instances: [] as { options: Record<string, unknown> }[],
  downloads: [] as { name: string; extension: string; options: Record<string, unknown> }[],
}))

vi.mock('qr-code-styling', () => ({
  default: class {
    options: Record<string, unknown>
    constructor(options: Record<string, unknown>) {
      this.options = options
      drawn.instances.push(this)
    }
    append() {}
    update(options: Record<string, unknown>) {
      this.options = options
    }
    async download({ name, extension }: { name: string; extension: string }) {
      drawn.downloads.push({ name, extension, options: this.options })
    }
  },
}))

let mock: MockAdapter

const SIMPLE = {
  dot_style: 'square',
  dot_color: '#000000',
  dot_gradient: null,
  gradient_type: 'linear',
  corner_style: 'square',
  corner_color: '#000000',
  eye_style: 'square',
  eye_color: '#000000',
  background: '#FFFFFF',
  logo: false,
  logo_size: 'medium',
  card_theme: 'light',
  title: 'Olive',
  subtitle: null,
  cta: null,
  show_url: true,
}

function payload(overrides: Record<string, unknown> = {}) {
  return {
    unlocked: true,
    url: 'http://localhost:8000/olive?qr=1',
    display_url: 'localhost/olive',
    card_url: 'http://localhost:8000/olive/qr',
    logo_data_url: null,
    brand_color: '#1F6FEB',
    settings: SIMPLE,
    defaults: SIMPLE,
    stats: { today: 3, week: 12, month: 40, total: 128 },
    ...overrides,
  }
}

function stub(overrides: Record<string, unknown> = {}) {
  mock.onGet('/api/qr').reply(200, { data: payload(overrides) })
}

/** The options the preview was last drawn with. */
function lastDrawn() {
  return drawn.instances.at(-1)?.options ?? {}
}

describe('QrPage', () => {
  beforeEach(() => {
    drawn.instances.length = 0
    drawn.downloads.length = 0
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

  it('draws the simple QR for the menu link', async () => {
    stub()
    renderWithProviders(<QrPage />)

    expect(await screen.findByRole('img', { name: "Your menu's QR code" })).toBeInTheDocument()
    expect(lastDrawn()).toMatchObject({
      data: 'http://localhost:8000/olive?qr=1',
      dotsOptions: { type: 'square', color: '#000000' },
      backgroundOptions: { color: '#FFFFFF' },
    })
  })

  it('shows how many scans came through the code', async () => {
    stub()
    renderWithProviders(<QrPage />)

    expect(await screen.findByText('128')).toBeInTheDocument()
    expect(screen.getByText('This week')).toBeInTheDocument()
  })

  it('downloads what is on screen, with a quiet zone round it', async () => {
    stub()
    const user = userEvent.setup()
    renderWithProviders(<QrPage />)

    await user.click(await screen.findByRole('button', { name: 'PNG' }))
    await user.click(screen.getByRole('button', { name: 'SVG' }))

    await waitFor(() => expect(drawn.downloads).toHaveLength(2))
    expect(drawn.downloads[0]).toMatchObject({ name: 'olive-qr', extension: 'png' })
    expect(drawn.downloads[1]).toMatchObject({ name: 'olive-qr', extension: 'svg' })
    expect(drawn.downloads[0]!.options).toMatchObject({ width: 1024, margin: 48, type: 'canvas' })
    expect(drawn.downloads[1]!.options).toMatchObject({ type: 'svg' })
  })

  it('previews a change before it is saved', async () => {
    stub()
    const user = userEvent.setup()
    renderWithProviders(<QrPage />)

    await user.click(await screen.findByRole('radio', { name: 'Dots' }))

    await waitFor(() =>
      expect(lastDrawn()).toMatchObject({ dotsOptions: { type: 'dots', color: '#000000' } }),
    )
  })

  it('saves the whole design, with blank card text sent as null', async () => {
    stub()
    mock
      .onPut('/api/qr')
      .reply(200, { data: payload({ settings: { ...SIMPLE, dot_style: 'rounded' } }) })
    const user = userEvent.setup()
    renderWithProviders(<QrPage />)

    // "Rounded" is both a dot shape and a corner frame, so pick it in the dots group.
    const dots = await screen.findByRole('group', { name: 'Dots' })
    await user.click(within(dots).getByRole('radio', { name: 'Rounded' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(mock.history.put).toHaveLength(1))
    expect(JSON.parse(mock.history.put[0]!.data as string)).toEqual({
      ...SIMPLE,
      dot_style: 'rounded',
    })
  })

  it('keeps Save off until something changes', async () => {
    stub()
    renderWithProviders(<QrPage />)

    expect(await screen.findByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('puts the simple look back but keeps the card text', async () => {
    stub({
      settings: {
        ...SIMPLE,
        dot_style: 'classy',
        dot_color: '#1F6FEB',
        dot_gradient: '#7C3AED',
        eye_color: '#111418',
        title: 'Maison Aran',
      },
    })
    const user = userEvent.setup()
    renderWithProviders(<QrPage />)

    await user.click(await screen.findByRole('button', { name: 'Reset to simple' }))

    await waitFor(() =>
      expect(lastDrawn()).toMatchObject({
        dotsOptions: { type: 'square', color: '#000000' },
        cornersDotOptions: { type: 'square', color: '#000000' },
      }),
    )
    expect(screen.getByLabelText('Title')).toHaveValue('Maison Aran')
  })

  it('warns when a colour is too close to the background to scan', async () => {
    stub({ settings: { ...SIMPLE, eye_color: '#EA4335' } })
    renderWithProviders(<QrPage />)

    expect(await screen.findByText('This may not scan')).toBeInTheDocument()
    expect(screen.getByText(/corner centres is too close/)).toBeInTheDocument()
  })

  it('does not warn about the simple QR', async () => {
    stub()
    renderWithProviders(<QrPage />)

    await screen.findByRole('button', { name: 'PNG' })
    expect(screen.queryByText('This may not scan')).not.toBeInTheDocument()
  })

  it('draws the logo only when there is one and it is switched on', async () => {
    stub({
      logo_data_url: 'data:image/png;base64,iVBORw0KGgo=',
      settings: { ...SIMPLE, logo: true },
    })
    renderWithProviders(<QrPage />)

    await screen.findByRole('button', { name: 'PNG' })
    expect(lastDrawn()).toMatchObject({
      image: 'data:image/png;base64,iVBORw0KGgo=',
      qrOptions: { errorCorrectionLevel: 'H' },
    })
  })

  it('switches the logo option off when the restaurant has no logo', async () => {
    stub()
    renderWithProviders(<QrPage />)

    expect(await screen.findByText('Add a logo on the Restaurant page first.')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Your logo in the middle' })).toBeDisabled()
  })

  it('shows only the plain code when customizing is not on the package', async () => {
    stub({ unlocked: false, stats: null, card_url: null })
    renderWithProviders(<QrPage />)

    expect(await screen.findByText('Customizing is not on your package')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'PNG' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
    expect(screen.queryByText('This week')).not.toBeInTheDocument()
  })

  it('shows an error with a retry when the code cannot load', async () => {
    mock.onGet('/api/qr').reply(500, { message: 'Server error', code: 'server_error' })
    renderWithProviders(<QrPage />)

    expect(await screen.findByRole('button', { name: /try again/i })).toBeInTheDocument()
  })
})
