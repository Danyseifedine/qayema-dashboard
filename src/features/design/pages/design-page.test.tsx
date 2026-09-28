import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { renderWithProviders } from '@/test/utils/render-with-providers'
import { makePackage, PACKAGE_CATALOGUE } from '@/test/mocks/factories/packages'
import { DesignPage } from '@/features/design/pages/design-page'

let mock: MockAdapter
const onOpenPackage = vi.fn()

const classic = {
  id: 1,
  slug: 'classic',
  name: { en: 'Classic', ar: null },
  description: { en: 'A clean, simple menu.', ar: null },
  thumbnail_url: null,
  settings_schema: [],
  is_premium: false,
  locked: false,
}

const midnight = {
  ...classic,
  id: 2,
  slug: 'midnight',
  name: { en: 'Midnight', ar: null },
  description: { en: 'Dark and moody.', ar: null },
}

function stub(current: number | null, designs: unknown[] = [classic, midnight], shown = current) {
  mock.onGet('/api/templates').reply(200, { data: designs, meta: { current, shown } })
  mock.onGet('/api/packages').reply(200, {
    data: PACKAGE_CATALOGUE,
    meta: { current: 'free', ends_at: null },
  })
}

const golden = {
  ...classic,
  id: 3,
  slug: 'golden',
  name: { en: 'Golden', ar: null },
  is_premium: true,
  locked: true,
}

describe('DesignPage', () => {
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
    renderWithProviders(<DesignPage locale="en" onOpenPackage={onOpenPackage} />)

    expect(await screen.findByText('Your menu needs a design')).toBeInTheDocument()
  })

  it('offers every free design for use', async () => {
    stub(null)
    renderWithProviders(<DesignPage locale="en" onOpenPackage={onOpenPackage} />)

    const buttons = await screen.findAllByRole('button', { name: 'Use this design' })
    expect(buttons).toHaveLength(2)
    expect(screen.queryByText(/coins/i)).not.toBeInTheDocument()
  })

  it('selects a design in one tap, with no confirmation step', async () => {
    stub(null)
    mock
      .onPost('/api/templates/select')
      .reply(200, { data: [classic, midnight], meta: { current: 2, shown: 2 } })

    const user = userEvent.setup()
    renderWithProviders(<DesignPage locale="en" onOpenPackage={onOpenPackage} />)

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
    renderWithProviders(<DesignPage locale="en" onOpenPackage={onOpenPackage} />)

    expect(await screen.findByText('In use')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Currently in use' })).toBeDisabled()
    expect(screen.getAllByRole('button', { name: 'Use this design' })).toHaveLength(1)
  })

  it('shows the server message when a switch fails', async () => {
    stub(1)
    mock.onPost('/api/templates/select').reply(422, { message: 'That design is no longer active.' })

    const user = userEvent.setup()
    renderWithProviders(<DesignPage locale="en" onOpenPackage={onOpenPackage} />)

    await user.click(await screen.findByRole('button', { name: 'Use this design' }))

    // The hook also toasts, so scope the assertion to the inline notice.
    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText('Could not switch design')).toBeInTheDocument()
    expect(within(alert).getByText('That design is no longer active.')).toBeInTheDocument()
  })

  it('marks a premium design and points to the package that has it', async () => {
    stub(1, [classic, golden])
    const user = userEvent.setup()
    renderWithProviders(<DesignPage locale="en" onOpenPackage={onOpenPackage} />)

    expect(await screen.findByText('Premium')).toBeInTheDocument()
    const locked = await screen.findByRole('button', { name: 'Comes with Premium' })
    await user.click(locked)

    expect(onOpenPackage).toHaveBeenCalled()
    expect(mock.history.post).toHaveLength(0)
  })

  it('says when the menu shows another design until the package allows the chosen one', async () => {
    stub(3, [classic, golden], 1)
    renderWithProviders(<DesignPage locale="en" onOpenPackage={onOpenPackage} />)

    expect(await screen.findByText('Your menu shows another design for now')).toBeInTheDocument()
    expect(
      screen.getByText(/Golden needs a package with premium designs, so your menu uses Classic/),
    ).toBeInTheDocument()
  })

  it('shows an error with a retry when the designs cannot load', async () => {
    mock.onGet('/api/templates').replyOnce(500, { message: 'Server down', code: 'server_error' })
    stub(1)
    const user = userEvent.setup()
    renderWithProviders(<DesignPage locale="en" onOpenPackage={onOpenPackage} />)

    expect(await screen.findByText('Server down')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('In use')).toBeInTheDocument()
  })

  it('says so when no design is published yet', async () => {
    stub(null, [])
    renderWithProviders(<DesignPage locale="en" onOpenPackage={onOpenPackage} />)

    expect(await screen.findByText('No designs available')).toBeInTheDocument()
  })

  it('draws the thumbnail, and falls back to the slug when there is no name', async () => {
    stub(null, [
      {
        ...classic,
        name: { en: null, ar: null },
        description: { en: null, ar: null },
        thumbnail_url: 'https://cdn.qayema.test/classic.png',
      },
    ])
    const { container } = renderWithProviders(
      <DesignPage locale="en" onOpenPackage={onOpenPackage} />,
    )

    expect(await screen.findByRole('heading', { name: 'classic' })).toBeInTheDocument()
    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      'https://cdn.qayema.test/classic.png',
    )
    expect(screen.queryByText('A clean, simple menu.')).not.toBeInTheDocument()
  })

  it('names the fallback designs by slug when they have no name', async () => {
    stub(
      3,
      [
        { ...classic, name: { en: null, ar: null } },
        { ...golden, name: { en: null, ar: null } },
      ],
      1,
    )
    renderWithProviders(<DesignPage locale="en" onOpenPackage={onOpenPackage} />)

    expect(
      await screen.findByText(
        /golden needs a package with premium designs, so your menu uses classic/,
      ),
    ).toBeInTheDocument()
  })

  it('points to the packages in general when none includes premium designs', async () => {
    mock
      .onGet('/api/templates')
      .reply(200, { data: [classic, golden], meta: { current: 1, shown: 1 } })
    mock.onGet('/api/packages').reply(200, {
      data: [makePackage()],
      meta: { current: 'free', ends_at: null },
    })
    renderWithProviders(<DesignPage locale="en" onOpenPackage={onOpenPackage} />)

    expect(await screen.findByRole('button', { name: 'See packages' })).toBeInTheDocument()
  })

  it('names the package by slug when it has no name at all', async () => {
    mock
      .onGet('/api/templates')
      .reply(200, { data: [classic, golden], meta: { current: 1, shown: 1 } })
    mock.onGet('/api/packages').reply(200, {
      data: [
        makePackage(),
        makePackage({
          id: 3,
          slug: 'premium',
          name: { en: null, ar: null },
          features: { premium_designs: true },
        }),
      ],
      meta: { current: 'free', ends_at: null },
    })
    renderWithProviders(<DesignPage locale="en" onOpenPackage={onOpenPackage} />)

    expect(await screen.findByRole('button', { name: 'Comes with premium' })).toBeInTheDocument()
  })

  it('shows the chosen design as busy while it switches', async () => {
    stub(1)
    let answer: (value: [number, unknown]) => void = () => {}
    mock.onPost('/api/templates/select').reply(
      () =>
        new Promise((resolve) => {
          answer = resolve
        }),
    )
    const user = userEvent.setup()
    renderWithProviders(<DesignPage locale="en" onOpenPackage={onOpenPackage} />)

    await user.click(await screen.findByRole('button', { name: 'Use this design' }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Use this design' })).toHaveAttribute(
        'aria-busy',
        'true',
      ),
    )
    // Only the one being switched to spins.
    expect(screen.getByRole('button', { name: 'Currently in use' })).not.toHaveAttribute(
      'aria-busy',
    )

    answer([200, { data: [classic, midnight], meta: { current: 2, shown: 2 } }])
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Currently in use' })).toBeInTheDocument(),
    )
  })
})
