import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { renderWithProviders } from '@/test/render-with-providers'
import { QrPage } from '@/features/qr/pages/qr-page'

/** jsdom has no canvas: the drawing library draws nothing here. */
vi.mock('qr-code-styling', () => ({
  default: class {
    append() {}
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

const QR = {
  unlocked: true,
  switched_off: false,
  url: 'http://localhost:8000/olive?qr=1',
  display_url: 'localhost/olive',
  card_url: 'http://localhost:8000/olive/qr',
  logo_data_url: null,
  brand_color: '#1F6FEB',
  settings: SIMPLE,
  defaults: SIMPLE,
  stats: { today: 3, week: 12, month: 40, total: 128 },
}

describe('QrPage', () => {
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

  it('shows an error with a retry when the code cannot load', async () => {
    mock.onGet('/api/qr').reply(500, { message: 'Server error', code: 'server_error' })
    renderWithProviders(<QrPage locale="en" onOpenFeatures={vi.fn()} onOpenPackage={vi.fn()} />)

    expect(await screen.findByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('retries a failed load, then shows the studio', async () => {
    mock.onGet('/api/qr').replyOnce(500, { message: 'Server error', code: 'server_error' })
    mock.onGet('/api/qr').reply(200, { data: QR })
    const user = userEvent.setup()
    renderWithProviders(<QrPage locale="en" onOpenFeatures={vi.fn()} onOpenPackage={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: /try again/i }))
    expect(await screen.findByRole('button', { name: 'Save image' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: "Your menu's QR code" })).toBeInTheDocument()
  })
})
