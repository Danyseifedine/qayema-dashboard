import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSession } from '@/features/auth'
import { i18n } from '@/lib/i18n'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { renderWithProviders } from '@/test/render-with-providers'
import { PACKAGE_CATALOGUE } from '@/test/factories/packages'
import { FULL_PLAN, makeSessionUser } from '@/test/factories/session'
import { FeaturesPage, type FeaturesPageProps } from '@/features/restaurant/pages/features-page'

let mock: MockAdapter

const ALL = FULL_PLAN

function page(props: Partial<FeaturesPageProps> = {}) {
  return (
    <FeaturesPage
      off={[]}
      plan={ALL}
      mainLocale="en"
      secondLocale="ar"
      defaultLocale="en"
      ordering={{ mode: 'whatsapp', types: ['delivery', 'pickup'] }}
      onOpenPackage={() => {}}
      onOpenTables={() => {}}
      onOpenDishes={() => {}}
      {...props}
    />
  )
}

/** The page as the app mounts it: everything read from the session cache. */
function FromSession() {
  const restaurant = useSession().data?.restaurant
  if (!restaurant) return null
  return (
    <FeaturesPage
      off={restaurant.switched_off}
      plan={restaurant.plan}
      mainLocale={restaurant.main_locale}
      secondLocale={restaurant.second_locale}
      defaultLocale={restaurant.default_locale}
      ordering={restaurant.ordering}
      onOpenPackage={() => {}}
      onOpenTables={() => {}}
      onOpenDishes={() => {}}
    />
  )
}

/** The languages as `/api/menu-languages` answers, nothing left to write unless said. */
function languages(data: {
  languages: string[]
  main_locale?: string
  second_locale: string | null
  default_locale: string
  missing?: { categories: number; dishes: number }
}) {
  return {
    data: {
      main_locale: data.languages[0],
      missing: { categories: 0, dishes: 0 },
      ...data,
    },
  }
}

/** A reply the test lets go of when it is ready, to look at the in-between state. */
function held() {
  let release: (value: [number, unknown]) => void = () => {}
  const reply = () =>
    new Promise<[number, unknown]>((resolve) => {
      release = resolve
    })
  return { reply, release: (value: [number, unknown]) => release(value) }
}

describe('FeaturesPage', () => {
  beforeEach(() => {
    mock = new MockAdapter(api)
    resetCsrfToken(api)
    installCsrfInterceptor(api)
    mock.onGet('/api/csrf-token').reply(200, { token: 'csrf' })
    mock
      .onGet('/api/menu-languages')
      .reply(200, languages({ languages: ['en', 'ar'], second_locale: 'ar', default_locale: 'en' }))
  })

  afterEach(() => {
    mock.restore()
    api.interceptors.request.clear()
    api.interceptors.response.clear()
    resetCsrfToken(api)
  })

  it('has a switch for orders, ordering at the table, variants, add-ons, the QR studio, analytics and languages', () => {
    renderWithProviders(page({ off: ['orders'] }))

    const switches = screen
      .getAllByRole('switch')
      .map((element) => element.getAttribute('aria-label'))
    expect(switches).toEqual([
      'Orders on',
      'Ordering at the table on',
      'Variants on',
      'Add-ons on',
      'QR Studio on',
      'Analytics on',
      'Multiple languages on',
    ])
    expect(screen.getByRole('switch', { name: 'Orders on' })).not.toBeChecked()
    expect(screen.getByRole('switch', { name: 'Analytics on' })).toBeChecked()
  })

  it('saves the whole list when a feature is switched off', async () => {
    mock.onPut('/api/features').reply(200, { data: { off: ['orders', 'analytics'] } })
    const user = userEvent.setup()
    renderWithProviders(page({ off: ['orders'] }))

    await user.click(screen.getByRole('switch', { name: 'Analytics on' }))

    await waitFor(() => expect(mock.history.put).toHaveLength(1))
    expect(JSON.parse(mock.history.put[0]!.data as string)).toEqual({
      off: ['orders', 'analytics'],
    })
  })

  it('says what switching orders and the QR studio off means', () => {
    renderWithProviders(page({ off: ['orders', 'qr'] }))

    expect(screen.getByText(/Guests can't order from your menu/)).toBeInTheDocument()
    expect(screen.getByText(/plain black QR code stays/)).toBeInTheDocument()
  })

  it('chooses the second language inside the languages row', async () => {
    mock
      .onPut('/api/menu-languages')
      .reply(200, languages({ languages: ['en', 'fr'], second_locale: 'fr', default_locale: 'en' }))
    const user = userEvent.setup()
    renderWithProviders(page())

    await user.click(screen.getByRole('combobox', { name: /Second language/ }))
    await user.click(await screen.findByRole('option', { name: /French/ }))

    await waitFor(() => expect(mock.history.put).toHaveLength(1))
    expect(JSON.parse(mock.history.put[0]!.data as string)).toEqual({
      main_locale: 'en',
      second_locale: 'fr',
      default_locale: 'en',
    })
  })

  it('sets which language the menu opens in', async () => {
    mock
      .onPut('/api/menu-languages')
      .reply(200, languages({ languages: ['en', 'ar'], second_locale: 'ar', default_locale: 'ar' }))
    const user = userEvent.setup()
    renderWithProviders(page())

    await user.click(screen.getByRole('tab', { name: 'Arabic' }))

    await waitFor(() => expect(mock.history.put).toHaveLength(1))
    expect(JSON.parse(mock.history.put[0]!.data as string)).toEqual({
      main_locale: 'en',
      second_locale: 'ar',
      default_locale: 'ar',
    })
  })

  it('hides the language choice while multiple languages are off', () => {
    renderWithProviders(page({ off: ['languages'] }))

    expect(screen.queryByRole('combobox', { name: /Second language/ })).not.toBeInTheDocument()
    expect(screen.getByText(/Your menu shows its main language only/)).toBeInTheDocument()
  })

  it('marks a feature the package does not include', () => {
    renderWithProviders(page({ plan: { ...ALL, qr_studio: false } }))

    expect(screen.getByText('Not on your package')).toBeInTheDocument()
  })

  it('shows a feature the package lacks as off, and it cannot be switched', () => {
    // The owner never switched QR Studio off; without the package it is off
    // anyway, and nothing is sent until the package includes it.
    renderWithProviders(page({ plan: { ...ALL, qr_studio: false } }))

    const qr = screen.getByRole('switch', { name: 'QR Studio on' })
    expect(qr).toHaveAttribute('aria-checked', 'false')
    expect(qr).toBeDisabled()
    // Its "while this is off" warning is about switching it off yourself.
    expect(screen.queryByText(/QR code goes back to plain/)).not.toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Orders on' })).toBeEnabled()
  })

  it('names the package each missing feature comes with', async () => {
    mock.onGet('/api/packages').reply(200, {
      data: PACKAGE_CATALOGUE,
      meta: { current: 'free' },
    })
    renderWithProviders(page({ plan: { ...ALL, ordering: false, analytics: false } }))

    // The first package that has it: Orders are Premium, Analytics start on Pro.
    expect(
      await screen.findByRole('button', { name: 'Available on Premium. See packages' }),
    ).toHaveTextContent('Premium')
    expect(
      screen.getByRole('button', { name: 'Available on Pro. See packages' }),
    ).toHaveTextContent('Pro')
    expect(screen.queryByText('Not on your package')).not.toBeInTheDocument()
  })

  it('opens the Package page from a feature the package lacks', async () => {
    const onOpenPackage = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(page({ plan: { ...ALL, ordering: false }, onOpenPackage }))

    await user.click(screen.getByRole('button', { name: /See packages$/ }))

    expect(onOpenPackage).toHaveBeenCalledOnce()
  })

  it('hides the language pickers when the package has no second language', () => {
    renderWithProviders(page({ plan: { ...ALL, multiple_languages: false } }))

    expect(screen.getByText('Not on your package')).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: /Second language/ })).not.toBeInTheDocument()
  })

  it('switches a feature back on by taking it off the list', async () => {
    mock.onPut('/api/features').reply(200, { data: { off: [] } })
    const user = userEvent.setup()
    renderWithProviders(page({ off: ['orders'] }))

    await user.click(screen.getByRole('switch', { name: 'Orders on' }))

    await waitFor(() => expect(mock.history.put).toHaveLength(1))
    expect(JSON.parse(mock.history.put[0]!.data as string)).toEqual({ off: [] })
  })

  it('moves the switch at once and keeps what the server saved', async () => {
    // The session reloads after a save, so it answers with what was saved.
    let saved: string[] = []
    mock.onGet('/api/user').reply(() => [200, { data: makeSessionUser({ switched_off: saved }) }])
    const answer = held()
    mock.onPut('/api/features').reply(answer.reply)
    const user = userEvent.setup()
    renderWithProviders(<FromSession />)

    await user.click(await screen.findByRole('switch', { name: 'Analytics on' }))

    // Optimistic: off before the server has answered.
    expect(screen.getByRole('switch', { name: 'Analytics on' })).not.toBeChecked()

    saved = ['analytics', 'qr']
    answer.release([200, { data: { off: saved } }])
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: 'QR Studio on' })).not.toBeChecked(),
    )
    expect(screen.getByRole('switch', { name: 'Analytics on' })).not.toBeChecked()
  })

  it('snaps the switch back and says why when the save fails', async () => {
    mock.onGet('/api/user').reply(200, { data: makeSessionUser({ switched_off: [] }) })
    const answer = held()
    mock.onPut('/api/features').reply(answer.reply)
    const user = userEvent.setup()
    renderWithProviders(<FromSession />)

    await user.click(await screen.findByRole('switch', { name: 'Analytics on' }))
    expect(screen.getByRole('switch', { name: 'Analytics on' })).not.toBeChecked()

    answer.release([500, { message: 'Server down', code: 'server_error' }])

    await waitFor(() => expect(screen.getByRole('switch', { name: 'Analytics on' })).toBeChecked())
    expect(await screen.findByText('Could not update your features')).toBeInTheDocument()
  })

  it('writes the saved languages into the session, so the pickers follow', async () => {
    mock.onGet('/api/user').reply(200, { data: makeSessionUser() })
    mock
      .onPut('/api/menu-languages')
      .reply(200, languages({ languages: ['en', 'fr'], second_locale: 'fr', default_locale: 'en' }))
    const user = userEvent.setup()
    renderWithProviders(<FromSession />)

    await user.click(await screen.findByRole('combobox', { name: /Second language/ }))
    // Earlier tests' toasts can still be up, so count the new one.
    const toasts = screen.queryAllByText('Menu languages saved').length
    await user.click(await screen.findByRole('option', { name: /French/ }))

    expect(await screen.findByRole('tab', { name: 'French' })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Arabic' })).not.toBeInTheDocument()
    await waitFor(() =>
      expect(screen.queryAllByText('Menu languages saved')).toHaveLength(toasts + 1),
    )
  })

  it('says so when the languages cannot be saved', async () => {
    mock.onPut('/api/menu-languages').reply(500, { message: 'Server down', code: 'server_error' })
    const user = userEvent.setup()
    renderWithProviders(page())

    await user.click(screen.getByRole('tab', { name: 'Arabic' }))

    expect(await screen.findByText('Could not save your menu languages')).toBeInTheDocument()
  })

  it('keeps the menu opening in the second language when that language changes', async () => {
    mock
      .onPut('/api/menu-languages')
      .reply(200, languages({ languages: ['en', 'fr'], second_locale: 'fr', default_locale: 'fr' }))
    const user = userEvent.setup()
    renderWithProviders(page({ defaultLocale: 'ar' }))

    expect(screen.getByRole('tab', { name: 'Arabic' })).toHaveAttribute('aria-selected', 'true')
    await user.click(screen.getByRole('combobox', { name: /Second language/ }))
    await user.click(await screen.findByRole('option', { name: /French/ }))

    await waitFor(() => expect(mock.history.put).toHaveLength(1))
    expect(JSON.parse(mock.history.put[0]!.data as string)).toEqual({
      main_locale: 'en',
      second_locale: 'fr',
      default_locale: 'fr',
    })
  })

  it('offers no opening language before a second one is chosen', () => {
    renderWithProviders(page({ secondLocale: null }))

    expect(screen.getByRole('combobox', { name: /Second language/ })).toBeInTheDocument()
    expect(screen.queryByRole('tablist', { name: 'The menu opens in' })).not.toBeInTheDocument()
  })

  it('chooses the main language for every package, a second one not needed', async () => {
    mock
      .onPut('/api/menu-languages')
      .reply(200, languages({ languages: ['fr'], second_locale: null, default_locale: 'fr' }))
    const user = userEvent.setup()
    renderWithProviders(page({ plan: { ...ALL, multiple_languages: false }, secondLocale: null }))

    await user.click(screen.getByRole('combobox', { name: /Your menu is written in/ }))
    await user.click(await screen.findByRole('option', { name: /French/ }))
    // A brand-new language asks first: what is written keeps its old text.
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('Write your menu in French?')
    await user.click(screen.getByRole('button', { name: 'Switch to French' }))

    await waitFor(() => expect(mock.history.put).toHaveLength(1))
    expect(JSON.parse(mock.history.put[0]!.data as string)).toEqual({
      main_locale: 'fr',
      second_locale: null,
      default_locale: 'fr',
    })
  })

  it('makes the second language the main one at once, swapping the two', async () => {
    mock
      .onPut('/api/menu-languages')
      .reply(200, languages({ languages: ['ar', 'en'], second_locale: 'en', default_locale: 'ar' }))
    const user = userEvent.setup()
    renderWithProviders(page())

    await user.click(screen.getByRole('combobox', { name: /Your menu is written in/ }))
    await user.click(await screen.findByRole('option', { name: /Arabic/ }))

    await waitFor(() => expect(mock.history.put).toHaveLength(1))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(JSON.parse(mock.history.put[0]!.data as string)).toEqual({
      main_locale: 'ar',
      second_locale: 'en',
      default_locale: 'ar',
    })
  })

  it('cancels a new main language without saving', async () => {
    const user = userEvent.setup()
    renderWithProviders(page())

    await user.click(screen.getByRole('combobox', { name: /Your menu is written in/ }))
    await user.click(await screen.findByRole('option', { name: /German/ }))
    await user.click(await screen.findByRole('button', { name: 'Cancel' }))

    expect(mock.history.put).toHaveLength(0)
  })

  it('says how much is left to write in a new main language, with the way to Dishes', async () => {
    mock.onGet('/api/menu-languages').reply(
      200,
      languages({
        languages: ['fr'],
        second_locale: null,
        default_locale: 'fr',
        missing: { categories: 1, dishes: 12 },
      }),
    )
    const onOpenDishes = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(page({ mainLocale: 'fr', secondLocale: null, onOpenDishes }))

    expect(
      await screen.findByText(
        '1 category and 12 dishes have no French name yet. Guests see their old name until you write one.',
      ),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Open Dishes' }))
    expect(onOpenDishes).toHaveBeenCalledOnce()
  })

  it('keeps the menu opening in the second language when a new main one arrives', async () => {
    mock
      .onPut('/api/menu-languages')
      .reply(200, languages({ languages: ['de', 'ar'], second_locale: 'ar', default_locale: 'ar' }))
    const user = userEvent.setup()
    renderWithProviders(page({ defaultLocale: 'ar' }))

    await user.click(screen.getByRole('combobox', { name: /Your menu is written in/ }))
    await user.click(await screen.findByRole('option', { name: /German/ }))
    await user.click(await screen.findByRole('button', { name: 'Switch to German' }))

    await waitFor(() => expect(mock.history.put).toHaveLength(1))
    expect(JSON.parse(mock.history.put[0]!.data as string)).toEqual({
      main_locale: 'de',
      second_locale: 'ar',
      default_locale: 'ar',
    })
  })

  it('saves nothing when the main language box is cleared', async () => {
    const user = userEvent.setup()
    renderWithProviders(page())

    const box = screen.getByRole('combobox', { name: /Your menu is written in/ })
    box.focus()
    await user.keyboard('{Escape}')

    // Nothing to switch to: the box keeps English, no question, nothing sent.
    await waitFor(() => expect(box).toHaveDisplayValue(/English/))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(mock.history.put).toHaveLength(0)
  })

  it('saves nothing when the second language box is cleared', async () => {
    const user = userEvent.setup()
    renderWithProviders(page())

    const box = screen.getByRole('combobox', { name: /Second language/ })
    box.focus()
    await user.keyboard('{Escape}')

    // An empty choice is no language: the menu keeps Arabic and nothing is sent.
    await waitFor(() => expect(box).toHaveDisplayValue(/Arabic/))
    expect(screen.getByRole('tab', { name: 'Arabic' })).toBeInTheDocument()
    expect(mock.history.put).toHaveLength(0)
  })

  it('never offers the main language as the second one', async () => {
    const user = userEvent.setup()
    renderWithProviders(page({ mainLocale: 'ar', secondLocale: 'en', defaultLocale: 'ar' }))

    await user.click(screen.getByRole('combobox', { name: /Second language/ }))
    expect(screen.queryByRole('option', { name: /Arabic/ })).not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: /English/ })).toBeInTheDocument()
  })

  it('names each language once when the dashboard already speaks it', async () => {
    await i18n.changeLanguage('ar')
    try {
      const user = userEvent.setup()
      renderWithProviders(page({ secondLocale: null }))

      await user.click(
        screen.getByRole('combobox', {
          name: new RegExp(i18n.t('features:languages.secondLabel')),
        }),
      )
      // In Arabic, Arabic's own name and its dashboard name are the same word.
      expect(await screen.findByRole('option', { name: 'العربية' })).toBeInTheDocument()
    } finally {
      await i18n.changeLanguage('en')
    }
  })

  describe('how guests send their orders', () => {
    it('chooses ordering in the menu, with both kinds of order', async () => {
      mock.onPut('/api/features/ordering').reply(200, {
        data: { mode: 'menu', types: ['delivery', 'pickup'] },
      })
      const user = userEvent.setup()
      renderWithProviders(page())

      expect(screen.getByText(/won't show on your Orders page/)).toBeInTheDocument()
      await user.click(screen.getByRole('tab', { name: 'In your menu' }))

      await waitFor(() => expect(mock.history.put).toHaveLength(1))
      expect(mock.history.put[0]!.url).toBe('/api/features/ordering')
      expect(JSON.parse(mock.history.put[0]!.data as string)).toEqual({
        mode: 'menu',
        types: ['delivery', 'pickup'],
      })
    })

    it('takes pickup only', async () => {
      mock.onPut('/api/features/ordering').reply(200, { data: { mode: 'menu', types: ['pickup'] } })
      const user = userEvent.setup()
      renderWithProviders(page({ ordering: { mode: 'menu', types: ['delivery', 'pickup'] } }))

      expect(screen.getByText(/Orders arrive on your Orders page with a sound/)).toBeInTheDocument()
      expect(screen.getByRole('switch', { name: 'Delivery' })).toHaveAttribute(
        'aria-checked',
        'true',
      )
      await user.click(screen.getByRole('switch', { name: 'Delivery' }))

      await waitFor(() => expect(mock.history.put).toHaveLength(1))
      expect(JSON.parse(mock.history.put[0]!.data as string)).toEqual({
        mode: 'menu',
        types: ['pickup'],
      })
    })

    it('takes pickup again next to delivery, in the order the server keeps', async () => {
      mock.onPut('/api/features/ordering').reply(200, {
        data: { mode: 'menu', types: ['delivery', 'pickup'] },
      })
      const user = userEvent.setup()
      renderWithProviders(page({ ordering: { mode: 'menu', types: ['delivery'] } }))

      expect(screen.getByRole('switch', { name: 'Pickup' })).toHaveAttribute(
        'aria-checked',
        'false',
      )
      await user.click(screen.getByRole('switch', { name: 'Pickup' }))

      await waitFor(() => expect(mock.history.put).toHaveLength(1))
      expect(JSON.parse(mock.history.put[0]!.data as string)).toEqual({
        mode: 'menu',
        types: ['delivery', 'pickup'],
      })
    })

    it('saves nothing when the way already chosen is picked again', async () => {
      const user = userEvent.setup()
      renderWithProviders(page())

      await user.click(screen.getByRole('tab', { name: 'WhatsApp' }))

      expect(screen.getByRole('tab', { name: 'WhatsApp' })).toHaveAttribute('aria-selected', 'true')
      expect(mock.history.put).toHaveLength(0)
    })

    it('keeps the last kind of order on, so guests can always order', () => {
      renderWithProviders(page({ ordering: { mode: 'menu', types: ['pickup'] } }))

      expect(screen.getByRole('switch', { name: 'Pickup' })).toBeDisabled()
      expect(screen.getByRole('switch', { name: 'Delivery' })).toBeEnabled()
      // Ordering at the table is its own feature, not one of these.
      expect(screen.queryByRole('switch', { name: 'At the table' })).not.toBeInTheDocument()
    })

    it('asks nothing about delivery while orders go to WhatsApp', () => {
      renderWithProviders(page())

      expect(screen.getByRole('tab', { name: 'WhatsApp' })).toHaveAttribute('aria-selected', 'true')
      expect(screen.queryByRole('group', { name: 'You take' })).not.toBeInTheDocument()
    })

    it('locks ordering in the menu without the package and names the one that has it', async () => {
      mock.onGet('/api/packages').reply(200, { data: PACKAGE_CATALOGUE, meta: { current: 'pro' } })
      const onOpenPackage = vi.fn()
      const user = userEvent.setup()
      renderWithProviders(page({ plan: { ...ALL, menu_ordering: false }, onOpenPackage }))

      expect(screen.getByRole('tab', { name: 'In your menu' })).toBeDisabled()
      await user.click(
        await screen.findByRole('button', { name: 'Available on Premium. See packages' }),
      )
      expect(onOpenPackage).toHaveBeenCalledOnce()
    })

    it('has no choice to make while orders are off', () => {
      renderWithProviders(page({ off: ['orders'] }))

      expect(
        screen.queryByRole('tablist', { name: 'Guests send their order' }),
      ).not.toBeInTheDocument()
    })

    it('moves at once, and snaps back with a reason when the save fails', async () => {
      mock.onGet('/api/user').reply(200, {
        data: makeSessionUser({ ordering: { mode: 'whatsapp', types: ['delivery', 'pickup'] } }),
      })
      const answer = held()
      mock.onPut('/api/features/ordering').reply(answer.reply)
      const user = userEvent.setup()
      renderWithProviders(<FromSession />)

      await user.click(await screen.findByRole('tab', { name: 'In your menu' }))
      expect(screen.getByRole('tab', { name: 'In your menu' })).toHaveAttribute(
        'aria-selected',
        'true',
      )

      answer.release([500, { message: 'Server down', code: 'server_error' }])
      await waitFor(() =>
        expect(screen.getByRole('tab', { name: 'WhatsApp' })).toHaveAttribute(
          'aria-selected',
          'true',
        ),
      )
      // The toaster outlives a test, so the one before may still show its own.
      expect((await screen.findAllByText('Could not update your features')).length).toBeGreaterThan(
        0,
      )
      expect(mock.history.put).toHaveLength(1)
    })
  })

  describe('ordering at the table', () => {
    it('is a feature of its own, switched off like any other', async () => {
      mock.onPut('/api/features').reply(200, { data: { off: ['dine_in'] } })
      const user = userEvent.setup()
      renderWithProviders(page({ ordering: { mode: 'whatsapp', types: ['delivery', 'pickup'] } }))

      await user.click(screen.getByRole('switch', { name: 'Ordering at the table on' }))

      await waitFor(() => expect(mock.history.put).toHaveLength(1))
      expect(JSON.parse(mock.history.put[0]!.data as string)).toEqual({ off: ['dine_in'] })
    })

    it('opens the Tables page while it is on', async () => {
      const onOpenTables = vi.fn()
      const user = userEvent.setup()
      renderWithProviders(page({ onOpenTables }))

      await user.click(screen.getByRole('button', { name: 'Set up your tables' }))

      expect(onOpenTables).toHaveBeenCalledOnce()
    })

    it('says what switching it off means', () => {
      renderWithProviders(page({ off: ['dine_in'] }))

      expect(
        screen.getByText(/guests can't order to their table while this is off/),
      ).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Set up your tables' })).not.toBeInTheDocument()
    })
  })
})
