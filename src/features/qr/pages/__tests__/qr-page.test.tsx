import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { renderWithProviders } from '@/test/render-with-providers'
import { PACKAGE_CATALOGUE } from '@/test/factories/packages'
import { QrPage } from '@/features/qr/pages/qr-page'

/**
 * The drawing library needs a real canvas, which jsdom does not have. The
 * fake records what it was asked to draw and download, which is what these
 * tests care about: the options going in, not the pixels coming out.
 */
const drawn = vi.hoisted(() => ({
  instances: [] as { options: Record<string, unknown> }[],
  downloads: [] as { name: string; extension: string; options: Record<string, unknown> }[],
  /** Set to make the next download reject, as a blocked download would. */
  failNext: false,
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
      if (drawn.failNext) {
        drawn.failNext = false
        throw new Error('blocked')
      }
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
    switched_off: false,
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
    drawn.failNext = false
    mock = new MockAdapter(api)
    resetCsrfToken(api)
    installCsrfInterceptor(api)
    mock.onGet('/api/csrf-token').reply(200, { token: 'csrf' })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    mock.restore()
    api.interceptors.request.clear()
    api.interceptors.response.clear()
    resetCsrfToken(api)
  })

  it('draws the simple QR for the menu link', async () => {
    stub()
    renderWithProviders(<QrPage locale="en" onOpenFeatures={vi.fn()} onOpenPackage={vi.fn()} />)

    expect(await screen.findByRole('img', { name: "Your menu's QR code" })).toBeInTheDocument()
    expect(lastDrawn()).toMatchObject({
      data: 'http://localhost:8000/olive?qr=1',
      dotsOptions: { type: 'square', color: '#000000' },
      backgroundOptions: { color: '#FFFFFF' },
    })
  })

  it('shows how many scans came through the code', async () => {
    stub()
    renderWithProviders(<QrPage locale="en" onOpenFeatures={vi.fn()} onOpenPackage={vi.fn()} />)

    expect(await screen.findByText('128')).toBeInTheDocument()
    expect(screen.getByText('This week')).toBeInTheDocument()
  })

  it('downloads what is on screen, with a quiet zone round it', async () => {
    stub()
    const user = userEvent.setup()
    renderWithProviders(<QrPage locale="en" onOpenFeatures={vi.fn()} onOpenPackage={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'Save image' }))
    await user.click(screen.getByRole('button', { name: 'Print file' }))

    await waitFor(() => expect(drawn.downloads).toHaveLength(2))
    expect(drawn.downloads[0]).toMatchObject({ name: 'olive-qr', extension: 'png' })
    expect(drawn.downloads[1]).toMatchObject({ name: 'olive-qr', extension: 'svg' })
    expect(drawn.downloads[0]!.options).toMatchObject({ width: 1024, margin: 48, type: 'canvas' })
    expect(drawn.downloads[1]!.options).toMatchObject({ type: 'svg' })
  })

  it('previews a change before it is saved', async () => {
    stub()
    const user = userEvent.setup()
    renderWithProviders(<QrPage locale="en" onOpenFeatures={vi.fn()} onOpenPackage={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'Shapes' }))
    await user.click(screen.getByRole('radio', { name: 'Dots' }))

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
    renderWithProviders(<QrPage locale="en" onOpenFeatures={vi.fn()} onOpenPackage={vi.fn()} />)

    // "Rounded" is both a dot shape and a corner frame, so pick it in the dots group.
    await user.click(await screen.findByRole('button', { name: 'Shapes' }))
    const dots = screen.getByRole('group', { name: 'Dots' })
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
    renderWithProviders(<QrPage locale="en" onOpenFeatures={vi.fn()} onOpenPackage={vi.fn()} />)

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
    renderWithProviders(<QrPage locale="en" onOpenFeatures={vi.fn()} onOpenPackage={vi.fn()} />)

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
    renderWithProviders(<QrPage locale="en" onOpenFeatures={vi.fn()} onOpenPackage={vi.fn()} />)

    expect(await screen.findByText('This may not scan')).toBeInTheDocument()
    expect(screen.getByText(/corner centres is too close/)).toBeInTheDocument()
  })

  it('does not warn about the simple QR', async () => {
    stub()
    renderWithProviders(<QrPage locale="en" onOpenFeatures={vi.fn()} onOpenPackage={vi.fn()} />)

    await screen.findByRole('button', { name: 'Save image' })
    expect(screen.queryByText('This may not scan')).not.toBeInTheDocument()
  })

  it('draws the logo only when there is one and it is switched on', async () => {
    stub({
      logo_data_url: 'data:image/png;base64,iVBORw0KGgo=',
      settings: { ...SIMPLE, logo: true },
    })
    renderWithProviders(<QrPage locale="en" onOpenFeatures={vi.fn()} onOpenPackage={vi.fn()} />)

    await screen.findByRole('button', { name: 'Save image' })
    expect(lastDrawn()).toMatchObject({
      image: 'data:image/png;base64,iVBORw0KGgo=',
      qrOptions: { errorCorrectionLevel: 'H' },
    })
  })

  it('switches the logo option off when the restaurant has no logo', async () => {
    stub()
    renderWithProviders(<QrPage locale="en" onOpenFeatures={vi.fn()} onOpenPackage={vi.fn()} />)

    expect(await screen.findByText('Add a logo on the Restaurant page first.')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Your logo in the middle' })).toBeDisabled()
  })

  it('shows only the plain code when the studio is not on the package', async () => {
    stub({ unlocked: false, stats: null, card_url: null })
    mock.onGet('/api/packages').reply(200, {
      data: PACKAGE_CATALOGUE,
      meta: { current: 'free', ends_at: null },
    })
    const onOpenPackage = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(
      <QrPage locale="en" onOpenFeatures={vi.fn()} onOpenPackage={onOpenPackage} />,
    )

    expect(await screen.findByText('Make the code your own')).toBeInTheDocument()
    // The chip names the package that has the studio.
    expect(await screen.findByText('Premium')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'See packages' }))
    expect(onOpenPackage).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Save image' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
    expect(screen.queryByText('This week')).not.toBeInTheDocument()
  })

  it('shows an error with a retry when the code cannot load', async () => {
    mock.onGet('/api/qr').reply(500, { message: 'Server error', code: 'server_error' })
    renderWithProviders(<QrPage locale="en" onOpenFeatures={vi.fn()} onOpenPackage={vi.fn()} />)

    expect(await screen.findByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('points to Features when the owner switched the studio off', async () => {
    stub({ unlocked: false, switched_off: true, stats: null, card_url: null })
    const onOpenFeatures = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(
      <QrPage locale="en" onOpenFeatures={onOpenFeatures} onOpenPackage={vi.fn()} />,
    )

    expect(await screen.findByRole('heading', { name: 'QR Studio is off' })).toBeInTheDocument()
    expect(screen.getByText('Simple mode active')).toBeInTheDocument()
    // The plain code is still there to download.
    expect(screen.getByRole('button', { name: 'Save image' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Open Features' }))
    expect(onOpenFeatures).toHaveBeenCalledOnce()
  })

  it('retries a failed load', async () => {
    mock.onGet('/api/qr').replyOnce(500, { message: 'Server error', code: 'server_error' })
    stub()
    const user = userEvent.setup()
    renderWithProviders(<QrPage locale="en" onOpenFeatures={vi.fn()} onOpenPackage={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: /try again/i }))
    expect(await screen.findByRole('button', { name: 'Save image' })).toBeInTheDocument()
  })

  it('says so when a download fails, and lets the owner try again', async () => {
    stub()
    const user = userEvent.setup()
    renderWithProviders(<QrPage locale="en" onOpenFeatures={vi.fn()} onOpenPackage={vi.fn()} />)

    drawn.failNext = true
    await user.click(await screen.findByRole('button', { name: 'Print file' }))

    expect(await screen.findByText('Could not download the QR code')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Print file' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Save image' })).toBeEnabled()
  })

  it('names the file "menu" when the link has no last part', async () => {
    stub({ display_url: 'localhost/' })
    const user = userEvent.setup()
    renderWithProviders(<QrPage locale="en" onOpenFeatures={vi.fn()} onOpenPackage={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'Save image' }))

    await waitFor(() => expect(drawn.downloads).toHaveLength(1))
    expect(drawn.downloads[0]).toMatchObject({ name: 'menu-qr', extension: 'png' })
  })

  it('copies the plain menu link, without the scan marker', async () => {
    stub()
    const user = userEvent.setup()
    // user-event puts its own clipboard on navigator; spy on that one.
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    renderWithProviders(<QrPage locale="en" onOpenFeatures={vi.fn()} onOpenPackage={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'Copy link' }))

    expect(writeText).toHaveBeenCalledWith('http://localhost:8000/olive')
    expect(await screen.findByText('Link copied')).toBeInTheDocument()
  })

  it('says so when the link cannot be copied', async () => {
    stub()
    const user = userEvent.setup()
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'))
    renderWithProviders(<QrPage locale="en" onOpenFeatures={vi.fn()} onOpenPackage={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'Copy link' }))

    expect(await screen.findByText('Could not copy the link')).toBeInTheDocument()
  })

  it('links to the printable card, and says it shows the saved design', async () => {
    stub()
    const user = userEvent.setup()
    renderWithProviders(<QrPage locale="en" onOpenFeatures={vi.fn()} onOpenPackage={vi.fn()} />)

    expect(
      await screen.findByRole('link', { name: 'Open the printable table card' }),
    ).toHaveAttribute('href', 'http://localhost:8000/olive/qr')
    expect(screen.queryByText(/Save to see these changes on it/)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Dots' }))
    expect(await screen.findByText(/Save to see these changes on it/)).toBeInTheDocument()
  })

  it('turns the gradient on at the brand violet, and off again', async () => {
    stub()
    const user = userEvent.setup()
    renderWithProviders(<QrPage locale="en" onOpenFeatures={vi.fn()} onOpenPackage={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'Colours' }))
    const gradient = screen.getByRole('switch', { name: 'Gradient' })
    await user.click(gradient)

    expect(await screen.findByText('Second colour')).toBeInTheDocument()
    await waitFor(() => expect(JSON.stringify(lastDrawn().dotsOptions)).toContain('#7C3AED'))

    await user.click(screen.getByRole('switch', { name: 'Gradient' }))
    await waitFor(() => expect(screen.queryByText('Second colour')).not.toBeInTheDocument())
  })

  it('lists every part that may not scan', async () => {
    stub({
      settings: { ...SIMPLE, dot_color: '#EEEEEE', corner_color: '#EEEEEE', eye_color: '#EEEEEE' },
    })
    renderWithProviders(<QrPage locale="en" onOpenFeatures={vi.fn()} onOpenPackage={vi.fn()} />)

    expect(
      await screen.findByText(/The dots, corner frames and corner centres are too close/),
    ).toBeInTheDocument()
  })

  it('says so when the design cannot be saved', async () => {
    stub()
    mock.onPut('/api/qr').reply(500, { message: 'Server down', code: 'server_error' })
    const user = userEvent.setup()
    renderWithProviders(<QrPage locale="en" onOpenFeatures={vi.fn()} onOpenPackage={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'Dots' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Server down')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
  })

  it('gives the three quick shapes in one tap, and shows which one is on', async () => {
    stub()
    const user = userEvent.setup()
    renderWithProviders(<QrPage locale="en" onOpenFeatures={vi.fn()} onOpenPackage={vi.fn()} />)

    const quick = await screen.findByRole('group', { name: 'Quick shapes' })
    expect(within(quick).getByRole('button', { name: 'Square' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await user.click(within(quick).getByRole('button', { name: 'Round' }))

    expect(within(quick).getByRole('button', { name: 'Round' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await waitFor(() =>
      expect(lastDrawn()).toMatchObject({
        dotsOptions: { type: 'rounded' },
        cornersSquareOptions: { type: 'dot' },
        cornersDotOptions: { type: 'dot' },
      }),
    )
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
  })

  it('opens every choice of a kind in a sheet, and Done puts it away', async () => {
    stub()
    const user = userEvent.setup()
    renderWithProviders(<QrPage locale="en" onOpenFeatures={vi.fn()} onOpenPackage={vi.fn()} />)

    expect(await screen.findByRole('button', { name: 'Colours' })).toBeInTheDocument()
    expect(screen.queryByRole('switch', { name: 'Gradient' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Colours' }))
    expect(screen.getByRole('switch', { name: 'Gradient' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Done' }))

    expect(screen.queryByRole('switch', { name: 'Gradient' })).not.toBeInTheDocument()
  })

  it('picks the card colour on its tile', async () => {
    stub()
    mock
      .onPut('/api/qr')
      .reply(200, { data: payload({ settings: { ...SIMPLE, card_theme: 'dark' } }) })
    const user = userEvent.setup()
    renderWithProviders(<QrPage locale="en" onOpenFeatures={vi.fn()} onOpenPackage={vi.fn()} />)

    const card = await screen.findByRole('radiogroup', { name: 'Printable card' })
    expect(within(card).getByRole('radio', { name: 'Light' })).toBeChecked()
    await user.click(within(card).getByRole('radio', { name: 'Dark' }))
    expect(within(card).getByRole('radio', { name: 'Dark' })).toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(mock.history.put).toHaveLength(1))
    expect(JSON.parse(mock.history.put[0]!.data as string)).toMatchObject({ card_theme: 'dark' })
  })

  it('switches the logo on from its tile, then its size opens', async () => {
    stub({ logo_data_url: 'data:image/png;base64,iVBORw0KGgo=' })
    const user = userEvent.setup()
    renderWithProviders(<QrPage locale="en" onOpenFeatures={vi.fn()} onOpenPackage={vi.fn()} />)

    const sizes = await screen.findByRole('button', { name: 'Logo' })
    expect(sizes).toBeDisabled()
    await user.click(screen.getByRole('switch', { name: 'Your logo in the middle' }))

    await waitFor(() =>
      expect(lastDrawn()).toMatchObject({ image: 'data:image/png;base64,iVBORw0KGgo=' }),
    )
    await user.click(sizes)
    expect(screen.getByRole('group', { name: 'Logo size' })).toBeInTheDocument()
  })

  it('shows the studio lock without a package name when none has the studio', async () => {
    stub({ unlocked: false, stats: null, card_url: null })
    mock.onGet('/api/packages').reply(500, { message: 'Server down', code: 'server_error' })
    renderWithProviders(<QrPage locale="en" onOpenFeatures={vi.fn()} onOpenPackage={vi.fn()} />)

    expect(await screen.findByText('Make the code your own')).toBeInTheDocument()
    expect(screen.queryByText('Premium')).not.toBeInTheDocument()
  })
})
