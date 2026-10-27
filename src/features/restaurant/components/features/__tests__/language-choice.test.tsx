import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import type { ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useSession } from '@/features/auth'
import { i18n } from '@/lib/i18n'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { renderWithProviders } from '@/test/render-with-providers'
import { makeSessionUser } from '@/test/factories/session'
import { LanguageChoice } from '@/features/restaurant/components/features/language-choice'

let mock: MockAdapter

function choice(props: Partial<ComponentProps<typeof LanguageChoice>> = {}) {
  return <LanguageChoice mainLocale="en" secondLocale="ar" defaultLocale="en" {...props} />
}

/** The pickers as the app mounts them: the languages read from the session cache. */
function FromSession() {
  const restaurant = useSession().data?.restaurant
  if (!restaurant) return null
  return (
    <LanguageChoice
      mainLocale={restaurant.main_locale}
      secondLocale={restaurant.second_locale}
      defaultLocale={restaurant.default_locale}
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

describe('LanguageChoice', () => {
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

  it('chooses the second language', async () => {
    mock
      .onPut('/api/menu-languages')
      .reply(200, languages({ languages: ['en', 'fr'], second_locale: 'fr', default_locale: 'en' }))
    const user = userEvent.setup()
    renderWithProviders(choice())

    await user.click(screen.getByRole('combobox', { name: /Which language/ }))
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
    renderWithProviders(choice())

    await user.click(screen.getByRole('tab', { name: 'Arabic' }))

    await waitFor(() => expect(mock.history.put).toHaveLength(1))
    expect(JSON.parse(mock.history.put[0]!.data as string)).toEqual({
      main_locale: 'en',
      second_locale: 'ar',
      default_locale: 'ar',
    })
  })

  it('writes the saved languages into the session, so the pickers follow', async () => {
    mock.onGet('/api/user').reply(200, { data: makeSessionUser() })
    mock
      .onPut('/api/menu-languages')
      .reply(200, languages({ languages: ['en', 'fr'], second_locale: 'fr', default_locale: 'en' }))
    const user = userEvent.setup()
    renderWithProviders(<FromSession />)

    await user.click(await screen.findByRole('combobox', { name: /Which language/ }))
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
    renderWithProviders(choice())

    await user.click(screen.getByRole('tab', { name: 'Arabic' }))

    expect(await screen.findByText('Could not save your menu languages')).toBeInTheDocument()
  })

  it('keeps the menu opening in the second language when that language changes', async () => {
    mock
      .onPut('/api/menu-languages')
      .reply(200, languages({ languages: ['en', 'fr'], second_locale: 'fr', default_locale: 'fr' }))
    const user = userEvent.setup()
    renderWithProviders(choice({ defaultLocale: 'ar' }))

    expect(screen.getByRole('tab', { name: 'Arabic' })).toHaveAttribute('aria-selected', 'true')
    await user.click(screen.getByRole('combobox', { name: /Which language/ }))
    await user.click(await screen.findByRole('option', { name: /French/ }))

    await waitFor(() => expect(mock.history.put).toHaveLength(1))
    expect(JSON.parse(mock.history.put[0]!.data as string)).toEqual({
      main_locale: 'en',
      second_locale: 'fr',
      default_locale: 'fr',
    })
  })

  it('offers no opening language before a second one is chosen', () => {
    renderWithProviders(choice({ secondLocale: null }))

    expect(screen.getByRole('combobox', { name: /Which language/ })).toBeInTheDocument()
    expect(screen.queryByRole('tablist', { name: 'Menu opens in' })).not.toBeInTheDocument()
  })

  it('saves nothing when the second language box is cleared', async () => {
    const user = userEvent.setup()
    renderWithProviders(choice())

    const box = screen.getByRole('combobox', { name: /Which language/ })
    box.focus()
    await user.keyboard('{Escape}')

    // An empty choice is no language: the menu keeps Arabic and nothing is sent.
    await waitFor(() => expect(box).toHaveDisplayValue(/Arabic/))
    expect(screen.getByRole('tab', { name: 'Arabic' })).toBeInTheDocument()
    expect(mock.history.put).toHaveLength(0)
  })

  it('never offers the main language as the second one', async () => {
    const user = userEvent.setup()
    renderWithProviders(choice({ mainLocale: 'ar', secondLocale: 'en', defaultLocale: 'ar' }))

    await user.click(screen.getByRole('combobox', { name: /Which language/ }))
    expect(screen.queryByRole('option', { name: /Arabic/ })).not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: /English/ })).toBeInTheDocument()
  })

  it('names each language once when the dashboard already speaks it', async () => {
    await i18n.changeLanguage('ar')
    try {
      const user = userEvent.setup()
      renderWithProviders(choice({ secondLocale: null }))

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
})
