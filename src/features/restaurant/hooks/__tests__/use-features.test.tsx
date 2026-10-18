import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import MockAdapter from 'axios-mock-adapter'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { analyticsKeys } from '@/features/analytics'
import { appearanceKeys } from '@/features/appearance'
import { sessionKeys } from '@/features/auth'
import { categoryKeys, dishKeys } from '@/features/menu'
import { qrKeys } from '@/features/qr'
import { restaurantKeys } from '@/features/restaurant/hooks/restaurant-keys'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { makeSessionUser } from '@/test/factories/session'
import { useSaveSwitchedOff } from '@/features/restaurant/hooks/use-features'
import { useSaveMenuLanguages } from '@/features/restaurant/hooks/use-menu-languages-save'
import { useSaveOrdering } from '@/features/restaurant/hooks/use-ordering-save'

let mock: MockAdapter

/** A cache holding an owner who has no restaurant yet. */
function withoutRestaurant() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const user = { ...makeSessionUser(), restaurant: null }
  queryClient.setQueryData(sessionKeys.current(), user)
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { queryClient, user, wrapper }
}

describe('restaurant save hooks on a session without a restaurant', () => {
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

  it('leaves the session alone when switching a feature', async () => {
    mock.onPut('/api/features').reply(200, { data: { off: ['orders'] } })
    const { queryClient, user, wrapper } = withoutRestaurant()

    const { result } = renderHook(() => useSaveSwitchedOff(), { wrapper })
    result.current.mutate(['orders'])

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryClient.getQueryData(sessionKeys.current())).toEqual(user)
  })

  it('leaves the session alone when saving the languages', async () => {
    mock.onPut('/api/menu-languages').reply(200, {
      data: {
        languages: ['en', 'fr'],
        main_locale: 'en',
        second_locale: 'fr',
        default_locale: 'en',
        missing: { categories: 0, dishes: 0 },
      },
    })
    const { queryClient, user, wrapper } = withoutRestaurant()

    const { result } = renderHook(() => useSaveMenuLanguages(), { wrapper })
    result.current.mutate({ main_locale: 'en', second_locale: 'fr', default_locale: 'en' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryClient.getQueryData(sessionKeys.current())).toEqual(user)
  })
})

describe('what a feature or language save throws away', () => {
  const pages = {
    qr: qrKeys.all,
    restaurant: restaurantKeys.all,
    categories: categoryKeys.all,
    dishes: dishKeys.all,
    appearance: appearanceKeys.all,
    analytics: analyticsKeys.advanced('30d'),
  }

  /** A session with a restaurant, and every page's copy already cached. */
  function withCachedPages() {
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    queryClient.setQueryData(sessionKeys.current(), makeSessionUser())
    for (const key of Object.values(pages)) queryClient.setQueryData(key, { cached: true })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    return { queryClient, wrapper }
  }

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

  it('switching a feature drops every page it changes, the QR page and analytics included', async () => {
    // Merely invalidated, the QR page opened on its old copy ("QR Studio is
    // switched off") until the refetch landed, and analytics still showed the
    // in-menu orders section a second after ordering was switched off.
    mock.onPut('/api/features').reply(200, { data: { off: ['qr'] } })
    const { queryClient, wrapper } = withCachedPages()

    const { result } = renderHook(() => useSaveSwitchedOff(), { wrapper })
    result.current.mutate(['qr'])

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    for (const [page, key] of Object.entries(pages)) {
      expect(queryClient.getQueryData(key), page).toBeUndefined()
    }
  })

  it('saving the languages drops every page that shows menu text', async () => {
    mock.onPut('/api/menu-languages').reply(200, {
      data: {
        languages: ['en', 'fr'],
        main_locale: 'en',
        second_locale: 'fr',
        default_locale: 'en',
        missing: { categories: 0, dishes: 0 },
      },
    })
    const { queryClient, wrapper } = withCachedPages()

    const { result } = renderHook(() => useSaveMenuLanguages(), { wrapper })
    result.current.mutate({ main_locale: 'en', second_locale: 'fr', default_locale: 'en' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    for (const page of ['restaurant', 'categories', 'dishes', 'appearance'] as const) {
      expect(queryClient.getQueryData(pages[page]), page).toBeUndefined()
    }
    // The QR code does not depend on the languages.
    expect(queryClient.getQueryData(pages.qr)).toEqual({ cached: true })
  })

  it('changing how orders arrive drops analytics, which counts each way on its own', async () => {
    mock.onPut('/api/features/ordering').reply(200, {
      data: { mode: 'whatsapp', types: ['delivery', 'pickup'] },
    })
    const { queryClient, wrapper } = withCachedPages()

    const { result } = renderHook(() => useSaveOrdering(), { wrapper })
    result.current.mutate({ mode: 'whatsapp', types: ['delivery', 'pickup'] })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryClient.getQueryData(pages.analytics)).toBeUndefined()
  })
})

describe('the menu languages follow the Multiple languages switch', () => {
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

  function withArabic(restaurant: Parameters<typeof makeSessionUser>[0] = {}) {
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    queryClient.setQueryData(sessionKeys.current(), makeSessionUser(restaurant))
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    const session = () =>
      queryClient.getQueryData<ReturnType<typeof makeSessionUser>>(sessionKeys.current())
        ?.restaurant
    return { wrapper, session }
  }

  it('switched off, the forms are English only at once; back on, Arabic returns', async () => {
    // Only switched_off changed before, so the category and dish forms kept
    // the Arabic field until the page reloaded.
    let respond = (_value: unknown) => {}
    mock.onPut('/api/features').reply(
      (config) =>
        new Promise((resolve) => {
          respond = () => resolve([200, { data: { off: JSON.parse(config.data as string).off } }])
        }),
    )
    const { wrapper, session } = withArabic({ default_locale: 'ar' })
    const { result } = renderHook(() => useSaveSwitchedOff(), { wrapper })

    result.current.mutate(['languages'])
    // Before the server answers: the tap alone takes Arabic away.
    await waitFor(() => expect(session()?.languages).toEqual(['en']))
    expect(session()?.default_locale).toBe('en')
    respond(null)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(session()?.languages).toEqual(['en'])

    result.current.mutate([])
    await waitFor(() => expect(session()?.languages).toEqual(['en', 'ar']))
    respond(null)
    await waitFor(() => expect(session()?.switched_off).toEqual([]))
  })

  it.each([
    ['no second language', { second_locale: null }],
    [
      'no package for it',
      { plan: { ...makeSessionUser().restaurant!.plan, multiple_languages: false } },
    ],
  ])('stays English only with %s', async (_why, restaurant) => {
    mock.onPut('/api/features').reply(200, { data: { off: [] } })
    const { wrapper, session } = withArabic(restaurant)
    const { result } = renderHook(() => useSaveSwitchedOff(), { wrapper })

    result.current.mutate([])
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(session()?.languages).toEqual(['en'])
  })
})
