import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import type { ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { renderWithProviders } from '@/test/render-with-providers'
import { MainLanguageField } from '@/features/restaurant/components/features/main-language-field'

let mock: MockAdapter

function field(props: Partial<ComponentProps<typeof MainLanguageField>> = {}) {
  return (
    <MainLanguageField
      mainLocale="en"
      secondLocale="ar"
      defaultLocale="en"
      canHaveSecond
      onOpenDishes={() => {}}
      {...props}
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

describe('MainLanguageField', () => {
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

  it('chooses the main language for every package, a second one not needed', async () => {
    mock
      .onPut('/api/menu-languages')
      .reply(200, languages({ languages: ['fr'], second_locale: null, default_locale: 'fr' }))
    const user = userEvent.setup()
    renderWithProviders(field({ canHaveSecond: false, secondLocale: null }))

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
    renderWithProviders(field())

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

  it('on a package with one language, makes the written second language the main one alone', async () => {
    // Free keeps no second language (the server refuses one), so the swap
    // sends the main language only; the other text stays saved.
    mock
      .onPut('/api/menu-languages')
      .reply(200, languages({ languages: ['ar'], second_locale: null, default_locale: 'ar' }))
    const user = userEvent.setup()
    renderWithProviders(field({ canHaveSecond: false }))

    await user.click(screen.getByRole('combobox', { name: /Your menu is written in/ }))
    await user.click(await screen.findByRole('option', { name: /Arabic/ }))

    await waitFor(() => expect(mock.history.put).toHaveLength(1))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(JSON.parse(mock.history.put[0]!.data as string)).toEqual({
      main_locale: 'ar',
      second_locale: null,
      default_locale: 'ar',
    })
  })

  it('on a package with one language, a new main language leaves a kept second one out', async () => {
    mock
      .onPut('/api/menu-languages')
      .reply(200, languages({ languages: ['fr'], second_locale: null, default_locale: 'fr' }))
    const user = userEvent.setup()
    renderWithProviders(field({ canHaveSecond: false, defaultLocale: 'ar' }))

    await user.click(screen.getByRole('combobox', { name: /Your menu is written in/ }))
    await user.click(await screen.findByRole('option', { name: /French/ }))
    await user.click(await screen.findByRole('button', { name: 'Switch to French' }))

    await waitFor(() => expect(mock.history.put).toHaveLength(1))
    expect(JSON.parse(mock.history.put[0]!.data as string)).toEqual({
      main_locale: 'fr',
      second_locale: null,
      default_locale: 'fr',
    })
  })

  it('cancels a new main language without saving', async () => {
    const user = userEvent.setup()
    renderWithProviders(field())

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
    renderWithProviders(field({ mainLocale: 'fr', secondLocale: null, onOpenDishes }))

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
    renderWithProviders(field({ defaultLocale: 'ar' }))

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
    renderWithProviders(field())

    const box = screen.getByRole('combobox', { name: /Your menu is written in/ })
    box.focus()
    await user.keyboard('{Escape}')

    // Nothing to switch to: the box keeps English, no question, nothing sent.
    await waitFor(() => expect(box).toHaveDisplayValue(/English/))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(mock.history.put).toHaveLength(0)
  })
})
