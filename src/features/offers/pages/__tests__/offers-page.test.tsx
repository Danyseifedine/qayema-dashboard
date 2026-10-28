import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { makeBuild, makeCategory, makeDish } from '@/test/factories/menu'
import { makeOffer } from '@/test/factories/offers'
import { FULL_PLAN, makeSessionUser } from '@/test/factories/session'
import { renderWithProviders } from '@/test/render-with-providers'
import { moveDown, stubSortableRects } from '@/test/sortable'
import { OffersPage } from '@/features/offers/pages/offers-page'
import type { Offer } from '@/features/offers/schemas/offer.schema'

let mock: MockAdapter

/** A dish's old and new price: two prices around a word, so the line spans elements. */
function priceLine(text: string | RegExp) {
  const matches = (element: Element) =>
    typeof text === 'string' ? element.textContent === text : text.test(element.textContent)
  // The innermost element holding the whole line.
  return (_: string, element: Element | null): boolean =>
    element !== null && matches(element) && !Array.from(element.children).some(matches)
}

/** The package's slots: Premium's 3 banners, 1 pop-up and 1 short ad unless told. */
const SLOTS = {
  banner: { used: 0, limit: 3 },
  popup: { used: 0, limit: 1 },
  ad: { used: 0, limit: 1 },
}

function stub(
  data: Offer[],
  stats: Record<string, { shown: number; taps: number }> = {},
  limit = 30,
  slots: Record<'banner' | 'popup' | 'ad', { used: number; limit: number | null }> = SLOTS,
) {
  mock.onGet('/api/offers').reply(200, {
    data,
    meta: { limit, slots, timezone: 'Asia/Beirut', currency: 'USD', stats },
  })
}

const kafta = makeDish({ id: 7, name: { en: 'Kafta', ar: null }, price: '12.50' })
const taouk = makeDish({ id: 8, name: { en: 'Shish taouk', ar: null }, price: '9.00' })

function sent(method: 'post' | 'patch'): Record<string, unknown> {
  const call = mock.history[method].find((request) => request.url?.startsWith('/api/offers'))
  return JSON.parse(call!.data as string) as Record<string, unknown>
}

type User = ReturnType<typeof userEvent.setup>

/** Moves the editor on a step, as the owner presses Next. */
async function next(user: User) {
  await user.click(screen.getByRole('button', { name: 'Next' }))
}

/** The open step's heading. */
function stepHeading(name: string) {
  return screen.getByRole('heading', { level: 3, name })
}

/** On the tap step: the offer gives a discount on dishes. */
async function giveDiscount(user: User) {
  await user.click(await screen.findByRole('tab', { name: 'A discount on your dishes' }))
}

/** A new offer titled `title`, moved on to its second step. */
async function startNew(user: User, title = 'Grill night') {
  await user.click(await screen.findByRole('button', { name: 'Create your first offer' }))
  await user.type(screen.getByLabelText(/^Title/), title)
  await next(user)
  expect(
    await screen.findByRole('heading', { level: 3, name: 'Where and shape' }),
  ).toBeInTheDocument()
}

describe('OffersPage', () => {
  beforeEach(() => {
    mock = new MockAdapter(api)
    resetCsrfToken(api)
    installCsrfInterceptor(api)
    mock.onGet('/api/csrf-token').reply(200, { token: 'csrf' })
    mock.onGet('/api/user').reply(200, { data: makeSessionUser({ languages: ['en'] }) })
    mock.onGet('/api/dishes').reply(200, {
      data: [kafta, taouk],
      meta: { used: 2, limit: null, currency: 'USD' },
    })
  })

  afterEach(() => {
    mock.restore()
    api.interceptors.request.clear()
    api.interceptors.response.clear()
    resetCsrfToken(api)
  })

  it('lists each offer with where it shows, its status, schedule and numbers', async () => {
    stub(
      [
        makeOffer({ placements: ['banner', 'popup'] }),
        makeOffer({
          id: 2,
          title: { en: 'Weekend grill' },
          status: 'scheduled',
          next_start: '2026-11-13T18:00',
          repeat: 'weekly',
          weekdays: ['fri', 'sat'],
          time_windows: [{ from: '18:00', to: '22:00' }],
          discount_type: 'percent',
          discount_value: '20.00',
          dish_ids: [7, 8],
        }),
        makeOffer({ id: 3, title: { en: 'Old deal' }, status: 'ended', is_active: true }),
        makeOffer({ id: 4, title: { en: 'Paused one' }, status: 'paused', is_active: false }),
      ],
      { '1': { shown: 12, taps: 3 } },
    )
    renderWithProviders(<OffersPage locale="en" onOpenCategories={vi.fn()} />)

    const card = (await screen.findByText('Happy hour')).closest<HTMLElement>('.glass-card')!
    expect(within(card).getByText('Live now')).toBeInTheDocument()
    expect(within(card).getByText('Banner and Pop-up')).toBeInTheDocument()
    expect(screen.getByText('Seen 12 times in 30 days · 3 taps')).toBeInTheDocument()
    expect(screen.getByText(/^Starts Nov 13, 6:00/)).toBeInTheDocument()
    expect(screen.getByText('20% off on 2 dishes')).toBeInTheDocument()
    expect(
      screen.getByText(/every Friday and Saturday, 6:00\s?PM to 10:00\s?PM/),
    ).toBeInTheDocument()
    expect(screen.getByText('Ended')).toBeInTheDocument()
    expect(screen.getByText('Paused')).toBeInTheDocument()
    // Under the list, and in the editor's summary too.
    expect(
      screen.getAllByText("Times follow your restaurant's time zone, Asia/Beirut."),
    ).not.toHaveLength(0)
  })

  it('offers an empty state, and says when the list could not load', async () => {
    stub([])
    renderWithProviders(<OffersPage locale="en" onOpenCategories={vi.fn()} />)
    expect(await screen.findByText('No offers yet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create your first offer' })).toBeEnabled()
  })

  it('shows an error with a way to try again', async () => {
    mock.onGet('/api/offers').replyOnce(500, { message: 'Down', code: 'server_error' })
    stub([makeOffer()])
    const user = userEvent.setup()
    renderWithProviders(<OffersPage locale="en" onOpenCategories={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Happy hour')).toBeInTheDocument()
  })

  it('stops adding at the limit', async () => {
    stub([makeOffer()], {}, 1)
    renderWithProviders(<OffersPage locale="en" onOpenCategories={vi.fn()} />)

    expect(await screen.findByText(/holds up to 1 offers/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New offer' })).toBeDisabled()
    expect(screen.getByText(/holds up to 1 offers/)).toBeInTheDocument()
  })

  it('pauses an offer from its card at once', async () => {
    stub([makeOffer()])
    mock
      .onPatch('/api/offers/1/active')
      .reply(200, { data: makeOffer({ is_active: false, status: 'paused' }) })
    const user = userEvent.setup()
    renderWithProviders(<OffersPage locale="en" onOpenCategories={vi.fn()} />)

    const toggle = await screen.findByRole('switch', { name: 'Show Happy hour on the menu' })
    await user.click(toggle)

    expect(toggle).toHaveAttribute('aria-checked', 'false')
    expect(await screen.findByText('Paused')).toBeInTheDocument()
    expect(JSON.parse(mock.history.patch[0]!.data as string)).toEqual({ is_active: false })
  })

  it('puts the switch back when pausing fails', async () => {
    stub([makeOffer()])
    mock.onPatch('/api/offers/1/active').reply(500, { message: 'Down', code: 'server_error' })
    const user = userEvent.setup()
    renderWithProviders(<OffersPage locale="en" onOpenCategories={vi.fn()} />)

    const toggle = await screen.findByRole('switch', { name: 'Show Happy hour on the menu' })
    await user.click(toggle)

    expect(await screen.findByText('Could not change that offer')).toBeInTheDocument()
    expect(toggle).toHaveAttribute('aria-checked', 'true')
  })

  it('deletes an offer after asking', async () => {
    stub([makeOffer()])
    mock.onDelete('/api/offers/1').reply(204)
    const user = userEvent.setup()
    renderWithProviders(<OffersPage locale="en" onOpenCategories={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'Delete Happy hour' }))
    await user.click(
      within(screen.getByRole('dialog', { name: 'Delete this offer?' })).getByRole('button', {
        name: 'Delete offer',
      }),
    )

    await waitFor(() => expect(mock.history.delete.length).toBe(1))
    expect(await screen.findByText('Offer deleted')).toBeInTheDocument()
  })

  it('reorders by dragging, and snaps back when the save fails', async () => {
    stubSortableRects()
    stub([makeOffer(), makeOffer({ id: 2, title: { en: 'Lunch deal' } })])
    mock.onPost('/api/offers/reorder').replyOnce(200, {
      data: [makeOffer({ id: 2, title: { en: 'Lunch deal' } }), makeOffer()],
    })
    const user = userEvent.setup()
    renderWithProviders(<OffersPage locale="en" onOpenCategories={vi.fn()} />)

    const handles = await screen.findAllByRole('button', { name: 'Reorder' })
    await moveDown(user, handles[0]!)
    await waitFor(() => expect(mock.history.post.length).toBe(1))
    expect(JSON.parse(mock.history.post[0]!.data as string)).toEqual({ ids: [2, 1] })

    mock.onPost('/api/offers/reorder').replyOnce(500, { message: 'Down', code: 'server_error' })
    await moveDown(user, (await screen.findAllByRole('button', { name: 'Reorder' }))[0]!)
    expect(await screen.findByText('Could not save the new order')).toBeInTheDocument()
  })

  it('says a delete failed', async () => {
    stub([makeOffer()])
    mock.onDelete('/api/offers/1').reply(500, { message: 'Down', code: 'server_error' })
    const user = userEvent.setup()
    renderWithProviders(<OffersPage locale="en" onOpenCategories={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'Delete Happy hour' }))
    await user.click(
      within(screen.getByRole('dialog', { name: 'Delete this offer?' })).getByRole('button', {
        name: 'Delete offer',
      }),
    )
    expect(await screen.findByText('Could not delete that offer')).toBeInTheDocument()
  })

  it('adds a discount on chosen dishes, every Friday evening, step by step', async () => {
    stub([])
    mock.onPost('/api/offers').reply(201, { data: makeOffer({ id: 9 }) })
    const user = userEvent.setup()
    renderWithProviders(<OffersPage locale="en" onOpenCategories={vi.fn()} />)

    await startNew(user)

    // Each place says how many of the package's slots are in use.
    expect(screen.getByRole('button', { name: /^Banner/ })).toHaveTextContent('0 of 3 in use')
    // Over the menu, a pop-up and an ad together.
    await user.click(screen.getByRole('button', { name: /Pop-up/ }))
    await user.click(screen.getByRole('button', { name: /Short ad/ }))
    expect(screen.getByRole('button', { name: /Pop-up/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Short ad/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('group', { name: 'Pop-up shape' })).toBeInTheDocument()
    expect(
      screen.getByText('Always a wide rectangle, at the bottom of the screen.'),
    ).toBeInTheDocument()
    const bannerShape = screen.getByRole('group', { name: 'Banner shape' })
    await user.click(within(bannerShape).getByRole('button', { name: /^Square/ }))
    expect(within(bannerShape).getByRole('button', { name: /^Square/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await user.click(screen.getByRole('tab', { name: 'Once a day' }))
    await user.click(
      within(
        screen.getByRole('tablist', { name: 'Short ad shows after the pop-up is closed, in' }),
      ).getByRole('tab', { name: '5 s' }),
    )
    await user.click(screen.getByRole('tab', { name: '8 s' }))
    await next(user)

    await giveDiscount(user)
    await user.click(screen.getByRole('tab', { name: 'Percent off' }))
    await user.type(screen.getByLabelText('Percent off'), '20')
    await user.click(screen.getByRole('checkbox', { name: /Kafta/ }))
    expect(screen.getByText(priceLine('$12.50 becomes $10.00'))).toBeInTheDocument()
    await user.type(screen.getByRole('searchbox', { name: 'Search your dishes' }), 'zzz')
    expect(screen.getByText('No dish matches that.')).toBeInTheDocument()
    await next(user)

    await user.click(await screen.findByRole('tab', { name: 'On a schedule' }))
    await user.click(screen.getByRole('tab', { name: 'Some weekdays' }))
    await user.click(screen.getByRole('button', { name: 'Fri' }))
    await user.click(screen.getByRole('switch', { name: 'All day' }))
    expect(screen.getByText(/every Friday, 5:00\s?PM to 7:00\s?PM/)).toBeInTheDocument()
    await next(user)

    // Everything at a glance before it is saved.
    expect(stepHeading('Review')).toBeInTheDocument()
    expect(screen.getByText('A title and text, no picture')).toBeInTheDocument()
    expect(screen.getAllByText('Banner (square)').length).toBeGreaterThan(0)
    expect(screen.getByText('Banner (square), Pop-up (square), and Short ad')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Once a day, the short ad 5 s after the pop-up closes, can be closed after 8 s',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('20% off on 1 dish')).toBeInTheDocument()
    expect(screen.getByText(/^every Friday, 5:00\s?PM to 7:00\s?PM/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add offer' }))

    await waitFor(() => expect(mock.history.post.some((r) => r.url === '/api/offers')).toBe(true))
    expect(sent('post')).toMatchObject({
      title: { en: 'Grill night' },
      placements: ['banner', 'popup', 'ad'],
      banner_shape: 'square',
      popup_shape: 'square',
      show_again: 'daily',
      ad_delay_seconds: 5,
      ad_seconds: 8,
      discount_type: 'percent',
      discount_value: 20,
      dish_ids: [7],
      repeat: 'weekly',
      weekdays: ['fri'],
      time_windows: [{ from: '17:00', to: '19:00' }],
      starts_at: null,
      ends_at: null,
    })
    expect(await screen.findByText('Offer added')).toBeInTheDocument()
    // Saved, the editor gives way to the list.
    expect(screen.queryByRole('navigation', { name: 'Offer steps' })).toBeNull()
  })

  it('lists the dishes under their categories, each with Select all', async () => {
    mock.onGet('/api/categories').reply(200, {
      data: [
        makeCategory({ id: 1, name: { en: 'Grills', ar: null } }),
        makeCategory({ id: 2, name: { en: 'Pizzas', ar: null } }),
      ],
      meta: { used: 2, limit: null },
    })
    mock.onGet('/api/dishes').reply(200, {
      data: [
        makeDish({ id: 7, name: { en: 'Margherita', ar: null }, category_id: 2 }),
        makeDish({ id: 8, name: { en: 'Kafta', ar: null }, category_id: 1 }),
        makeDish({ id: 9, name: { en: 'Pepperoni', ar: null }, category_id: 2 }),
      ],
      meta: { used: 3, limit: null, currency: 'USD' },
    })
    stub([])
    const user = userEvent.setup()
    renderWithProviders(<OffersPage locale="en" onOpenCategories={vi.fn()} />)

    await startNew(user)
    await next(user)
    await giveDiscount(user)

    // In the menu's order of categories, not the dishes' own.
    const pizzas = await screen.findByRole('group', { name: 'Pizzas' })
    const grills = screen.getByRole('group', { name: 'Grills' })
    expect(grills.compareDocumentPosition(pizzas) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(pizzas).getAllByRole('checkbox')).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: 'Select all in Pizzas' }))
    expect(within(pizzas).getByRole('checkbox', { name: /Margherita/ })).toBeChecked()
    expect(within(pizzas).getByRole('checkbox', { name: /Pepperoni/ })).toBeChecked()
    expect(within(grills).getByRole('checkbox', { name: /Kafta/ })).not.toBeChecked()
    expect(screen.getByText('2 chosen')).toBeInTheDocument()

    // Then it clears them.
    await user.click(screen.getByRole('button', { name: 'Clear Pizzas' }))
    expect(screen.getByText('0 chosen')).toBeInTheDocument()
  })

  it('adds a 2nd item deal on a pizza priced by its sizes, shown all the time, its deal on Wednesday evenings', async () => {
    const pizza = makeDish({
      id: 9,
      name: { en: 'Pizza', ar: null },
      price: null,
      variants: [
        {
          id: 90,
          name: { en: 'Size' },
          options: [
            { id: 91, name: { en: 'Small' }, price: '8.00' },
            { id: 92, name: { en: 'Large' }, price: '12.00' },
          ],
        },
      ],
    })
    // Priced only by choices that are not sizes: no price to show.
    const platter = makeDish({ id: 10, name: { en: 'Platter', ar: null }, price: null })
    // Built by guests, in no category: priced by what they build.
    const built = makeDish({
      id: 11,
      name: { en: 'Build your pizza', ar: null },
      price: null,
      category_id: null,
      builds: [makeBuild()],
    })
    mock.onGet('/api/dishes').reply(200, {
      data: [kafta, pizza, platter, built],
      meta: { used: 4, limit: null, currency: 'USD' },
    })
    stub([])
    mock.onPost('/api/offers').reply(201, { data: makeOffer({ id: 9 }) })
    const user = userEvent.setup()
    renderWithProviders(<OffersPage locale="en" onOpenCategories={vi.fn()} />)

    await startNew(user)
    await next(user)
    await giveDiscount(user)

    // A percent covers the size: each size of the pizza, discounted.
    await user.click(screen.getByRole('tab', { name: 'Percent off' }))
    await user.type(screen.getByLabelText('Percent off'), '20')
    await user.click(await screen.findByRole('checkbox', { name: /Pizza/ }))
    expect(screen.getByText(priceLine(/^Small \$8\.00 becomes \$6\.40$/))).toBeInTheDocument()
    expect(screen.getByText(priceLine(/Large \$12\.00 becomes \$9\.60$/))).toBeInTheDocument()
    // The dishes guests build come first, in a group of their own that says how they are priced.
    const builds = screen.getByRole('group', { name: 'Dishes guests build' })
    expect(within(builds).getByRole('checkbox', { name: /Build your pizza/ })).toHaveTextContent(
      /^Build your pizza$/,
    )
    expect(within(builds).getByText(/Priced by what each guest picks/)).toBeInTheDocument()
    expect(screen.getAllByRole('checkbox')[0]).toHaveAccessibleName(/Build your pizza/)

    // The second of a pair starts free.
    await user.click(screen.getByRole('tab', { name: '2nd one off' }))
    const second = screen.getByRole('tablist', { name: 'The second one' })
    expect(within(second).getByRole('tab', { name: 'Free' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByText(/the second is free or cheaper/)).toBeInTheDocument()
    expect(screen.getByText(priceLine(/^Small \$8\.00, 2nd free$/))).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: /Kafta/ }))
    expect(screen.getByText(priceLine('$12.50, 2nd free'))).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /Platter/ })).toHaveTextContent(/^Platter$/)
    // Picked again, it stays as it is.
    await user.click(screen.getByRole('tab', { name: '2nd one off' }))
    expect(within(second).getByRole('tab', { name: 'Free' })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    await user.click(within(second).getByRole('tab', { name: 'Percent off' }))
    expect(screen.getByLabelText('Percent off the second one')).toHaveValue('50')
    expect(screen.getByText(priceLine('$12.50, 2nd $6.25'))).toBeInTheDocument()
    // Typing past 100 keeps the box, so its message can say why.
    const percent = screen.getByLabelText('Percent off the second one')
    await user.clear(percent)
    await user.type(percent, '150')
    expect(screen.getByLabelText('Percent off the second one')).toHaveValue('150')
    await next(user)
    expect(
      await screen.findByText('The second one can be at most 100% off, which makes it free.'),
    ).toBeInTheDocument()
    await user.clear(percent)
    await user.type(percent, '50')
    await user.click(within(second).getByRole('tab', { name: 'Free' }))
    expect(screen.queryByLabelText('Percent off the second one')).toBeNull()

    // Another kind of discount starts empty, and the 2nd item free again.
    await user.click(screen.getByRole('tab', { name: 'Amount off' }))
    expect(screen.getByLabelText('Amount off')).toHaveValue('')
    await user.click(screen.getByRole('tab', { name: '2nd one off' }))
    const again = screen.getByRole('tablist', { name: 'The second one' })
    expect(within(again).getByRole('tab', { name: 'Free' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await user.click(within(again).getByRole('tab', { name: 'Percent off' }))
    await next(user)

    // Shown all the time, the deal only on Wednesday evenings.
    await user.click(await screen.findByRole('tab', { name: 'On a schedule' }))
    expect(screen.queryByRole('switch', { name: 'Show it all the time' })).toBeNull()
    await user.click(screen.getByRole('tab', { name: 'Some weekdays' }))
    await user.click(screen.getByRole('button', { name: 'Wed' }))
    await user.click(screen.getByRole('switch', { name: 'All day' }))
    await user.click(screen.getByRole('switch', { name: 'Show it all the time' }))
    expect(
      screen.getByText(/every Wednesday, 5:00\s?PM to 7:00\s?PM, shown all the time/),
    ).toBeInTheDocument()
    await next(user)

    expect(screen.getByText('2nd one 50% off on 2 dishes')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add offer' }))

    await waitFor(() => expect(mock.history.post.some((r) => r.url === '/api/offers')).toBe(true))
    expect(sent('post')).toMatchObject({
      discount_type: 'second',
      discount_value: 50,
      dish_ids: [9, 7],
      repeat: 'weekly',
      weekdays: ['wed'],
      shows_outside_hours: true,
    })
  })

  it('says on a card that an offer is a 2nd item deal, shown while its deal waits', async () => {
    stub([
      makeOffer({
        discount_type: 'second',
        discount_value: '100.00',
        dish_ids: [7],
        repeat: 'weekly',
        weekdays: ['wed'],
        shows_outside_hours: true,
        status: 'scheduled',
        next_start: '2099-11-04T17:00',
      }),
    ])
    renderWithProviders(<OffersPage locale="en" onOpenCategories={vi.fn()} />)

    expect(await screen.findByText('2nd one free on 1 dish')).toBeInTheDocument()
    expect(screen.getByText(/^Shown, deal from Nov 4, 5:00\s?PM$/)).toBeInTheDocument()
    expect(screen.getByText('every Wednesday, all day, shown all the time')).toBeInTheDocument()
  })

  it('moves on only once each step is right', async () => {
    stub([])
    const user = userEvent.setup()
    renderWithProviders(<OffersPage locale="en" onOpenCategories={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'Create your first offer' }))
    expect(screen.getByRole('button', { name: /^Step 2: Where and shape/ })).toBeDisabled()
    await next(user)
    expect(await screen.findByText('An offer needs a title in English.')).toBeInTheDocument()
    expect(stepHeading('Picture and text')).toBeInTheDocument()

    await user.type(screen.getByLabelText(/^Title/), 'Deal')
    await next(user)
    expect(
      await screen.findByRole('heading', { level: 3, name: 'Where and shape' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Step 1: Picture and text, done/ })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: /Banner/ }))
    await next(user)
    expect(await screen.findByText('Choose where the offer shows.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Short ad/ }))
    expect(
      screen.getByText('Always a wide rectangle, at the bottom of the screen.'),
    ).toBeInTheDocument()
    await next(user)

    await giveDiscount(user)
    await user.click(screen.getByRole('tab', { name: 'Open a link' }))
    await user.type(screen.getByLabelText('Link'), 'http://x')
    await user.click(screen.getByRole('tab', { name: 'Percent off' }))
    await user.type(screen.getByLabelText('Percent off'), '95')
    await next(user)
    expect(await screen.findByText('Add a link that starts with https://.')).toBeInTheDocument()
    expect(screen.getByText('A discount can take off at most 90%.')).toBeInTheDocument()
    expect(screen.getByText('Choose the dishes this offer is for.')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Link'))
    await user.type(screen.getByLabelText('Link'), 'https://example.com')
    await user.clear(screen.getByLabelText('Percent off'))
    await user.type(screen.getByLabelText('Percent off'), '10')
    await user.click(screen.getByRole('checkbox', { name: /Kafta/ }))
    await next(user)

    await user.click(await screen.findByRole('tab', { name: 'On a schedule' }))
    await user.click(screen.getByRole('tab', { name: 'Some days of the month' }))
    await next(user)
    expect(await screen.findByText('Pick at least one day of the month.')).toBeInTheDocument()

    // Back always goes, and a step reached earlier opens from the stepper.
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(stepHeading('What guests get')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^Step 4: When/ }))
    expect(stepHeading('When')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Step 5: Review/ })).toBeDisabled()
    expect(mock.history.post.some((r) => r.url === '/api/offers')).toBe(false)
  })

  it('goes back to a step from the review to change it', async () => {
    stub([])
    const user = userEvent.setup()
    renderWithProviders(<OffersPage locale="en" onOpenCategories={vi.fn()} />)

    await startNew(user, 'Brunch')
    await next(user)
    await next(user)
    await next(user)
    expect(stepHeading('Review')).toBeInTheDocument()
    expect(screen.getAllByText('Brunch').length).toBeGreaterThan(0)
    expect(screen.getByText('Nothing to order')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Edit Where and shape' }))
    expect(stepHeading('Where and shape')).toHaveFocus()
    // Every step up to the review is still open.
    expect(screen.getByRole('button', { name: /^Step 5: Review/ })).toBeEnabled()
  })

  it('edits an offer with its saved schedule, from any step, and sends it whole', async () => {
    stub([
      makeOffer({
        starts_at: '2026-11-01T00:00',
        ends_at: '2026-12-01T00:00',
        repeat: 'monthly',
        month_days: [1, 15],
        action: 'link',
        action_url: 'https://example.com',
        placements: ['popup'],
        popup_shape: 'tall',
      }),
    ])
    mock.onPatch('/api/offers/1').reply(200, { data: makeOffer() })
    const user = userEvent.setup()
    renderWithProviders(<OffersPage locale="en" onOpenCategories={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'Edit Happy hour' }))
    expect(screen.getByRole('heading', { level: 2, name: 'Edit offer' })).toBeInTheDocument()

    // A saved offer opens with every step in reach.
    await user.click(screen.getByRole('button', { name: /^Step 2: Where and shape/ }))
    expect(
      within(screen.getByRole('group', { name: 'Pop-up shape' })).getByRole('button', {
        name: /^Tall/,
      }),
    ).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: /^Step 4: When/ }))
    // The day field, not the time's "Until: hour".
    expect(screen.getByRole('combobox', { name: /^Until(?!:)/ })).toHaveValue('Mon, Nov 30, 2026')
    expect(
      screen.getByText(/on day 1 and 15 of each month, all day, from Nov 1, until Nov 30/),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '15' }))
    await user.click(screen.getByRole('button', { name: 'Save offer' }))

    await waitFor(() => expect(mock.history.patch.length).toBe(1))
    expect(sent('patch')).toMatchObject({
      starts_at: '2026-11-01T00:00',
      ends_at: '2026-12-01T00:00',
      repeat: 'monthly',
      month_days: [1],
      action_url: 'https://example.com',
      popup_shape: 'tall',
    })
    expect(await screen.findByText('Happy hour')).toBeInTheDocument()
  })

  it("shows a saved ad's own seconds picked, and starts a new ad on one of the choices", async () => {
    // Made in the admin: 6 s and a 30 s wait are not among the editor's choices.
    // Paused, so the new one may take the short ad.
    stub([
      makeOffer({
        placements: ['ad'],
        ad_seconds: 6,
        ad_delay_seconds: 30,
        is_active: false,
        status: 'paused',
      }),
    ])
    const user = userEvent.setup()
    renderWithProviders(<OffersPage locale="en" onOpenCategories={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'Edit Happy hour' }))
    await user.click(screen.getByRole('button', { name: /^Step 2: Where and shape/ }))
    const stays = screen.getByRole('tablist', { name: 'Can be closed after' })
    expect(within(stays).getByRole('tab', { name: '6 s' })).toHaveAttribute('aria-selected', 'true')
    expect(
      within(screen.getByRole('tablist', { name: 'Wait before it shows' })).getByRole('tab', {
        name: '30 s',
      }),
    ).toHaveAttribute('aria-selected', 'true')

    await user.click(screen.getByRole('button', { name: 'Back to your offers' }))
    await user.click(await screen.findByRole('button', { name: 'New offer' }))
    await user.type(screen.getByLabelText(/^Title/), 'Lunch')
    await next(user)
    await user.click(screen.getByRole('button', { name: /^Short ad/ }))
    const fresh = screen.getByRole('tablist', { name: 'Can be closed after' })
    expect(within(fresh).getByRole('tab', { name: '5 s' })).toHaveAttribute('aria-selected', 'true')
    expect(within(fresh).queryByRole('tab', { name: '6 s' })).toBeNull()
  })

  it('takes a message away as soon as its fix is made', async () => {
    stub([])
    const user = userEvent.setup()
    renderWithProviders(<OffersPage locale="en" onOpenCategories={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'Create your first offer' }))
    await next(user)
    expect(await screen.findByText('An offer needs a title in English.')).toBeInTheDocument()
    await user.type(screen.getByLabelText(/^Title/), 'G')
    await waitFor(() =>
      expect(screen.queryByText('An offer needs a title in English.')).not.toBeInTheDocument(),
    )
    // Still on the first step: only Next moves on.
    expect(stepHeading('Picture and text')).toBeInTheDocument()
  })

  it('opens a new offer from the top and goes back to the list', async () => {
    stub([
      makeOffer({
        discount_type: 'amount',
        discount_value: '2.00',
        dish_ids: [7],
        image_url: 'https://cdn.test/o.webp',
      }),
    ])
    const user = userEvent.setup()
    const { container } = renderWithProviders(<OffersPage locale="en" onOpenCategories={vi.fn()} />)

    expect(await screen.findByText('$2.00 off on 1 dish')).toBeInTheDocument()
    expect(container.querySelector('img[src="https://cdn.test/o.webp"]')).not.toBeNull()

    await user.click(screen.getByRole('button', { name: 'New offer' }))
    const title = screen.getByRole('heading', { level: 2, name: 'New offer' })
    expect(title).toHaveFocus()
    expect(screen.getByRole('navigation', { name: 'Offer steps' })).toBeInTheDocument()
    expect(screen.getByText('Step 1 of 5: Picture and text')).toBeInTheDocument()

    // Nothing changed: back goes straight to the list.
    await user.click(screen.getByRole('button', { name: 'Back to your offers' }))
    expect(await screen.findByText('$2.00 off on 1 dish')).toBeInTheDocument()
  })

  it('asks before leaving with changes', async () => {
    stub([])
    const user = userEvent.setup()
    renderWithProviders(<OffersPage locale="en" onOpenCategories={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'Create your first offer' }))
    await user.type(screen.getByLabelText(/^Title/), 'Half typed')
    await user.click(screen.getByRole('button', { name: 'Back to your offers' }))

    const ask = screen.getByRole('dialog', { name: 'Leave without saving?' })
    await user.click(within(ask).getByRole('button', { name: 'Cancel' }))
    expect(screen.getByLabelText(/^Title/)).toHaveValue('Half typed')

    await user.click(screen.getByRole('button', { name: 'Back to your offers' }))
    await user.click(
      within(screen.getByRole('dialog', { name: 'Leave without saving?' })).getByRole('button', {
        name: 'Leave',
      }),
    )
    expect(await screen.findByText('No offers yet')).toBeInTheDocument()
  })

  it('builds a tall pop-up with a link and evening times', async () => {
    stub([])
    mock.onPost('/api/offers').reply(201, { data: makeOffer() })
    const user = userEvent.setup()
    renderWithProviders(<OffersPage locale="en" onOpenCategories={vi.fn()} />)

    await startNew(user, 'Brunch')
    await user.click(screen.getByRole('button', { name: /Pop-up/ }))
    await user.click(
      within(screen.getByRole('group', { name: 'Pop-up shape' })).getByRole('button', {
        name: /^Tall/,
      }),
    )
    // A pop-up waits, but has no seconds of its own.
    await user.click(screen.getByRole('tab', { name: '5 s' }))
    expect(screen.queryByText('Can be closed after')).toBeNull()
    await next(user)

    await user.click(await screen.findByRole('tab', { name: 'Open a link' }))
    await user.type(screen.getByLabelText('Link'), 'https://example.com/brunch')
    await next(user)

    await user.click(await screen.findByRole('tab', { name: 'On a schedule' }))
    // Picked on the calendar: from today's month to November 2026.
    await user.click(screen.getByRole('combobox', { name: /^From(?!:)/ }))
    const now = new Date()
    const months = (2026 - now.getFullYear()) * 12 + 10 - now.getMonth()
    await user.keyboard((months < 0 ? '{PageUp}' : '{PageDown}').repeat(Math.abs(months)))
    await user.click(screen.getByRole('button', { name: 'Sunday, November 1, 2026' }))
    await user.click(screen.getByRole('switch', { name: 'All day' }))
    await user.click(screen.getByRole('button', { name: 'Add a time' }))
    await user.click(screen.getByRole('button', { name: 'Add a time' }))
    expect(screen.queryByRole('button', { name: 'Add a time' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Remove time 3' }))
    await user.click(screen.getByRole('button', { name: 'Remove time 2' }))
    // The one left runs from 10 PM past midnight.
    await user.click(screen.getByRole('combobox', { name: 'Time 1 starts: hour' }))
    await user.click(screen.getByRole('option', { name: '10' }))
    expect(screen.getByText('Ends the next day, after midnight.')).toBeInTheDocument()
    await next(user)

    expect(screen.getByText('Banner (rectangle) and Pop-up (tall)')).toBeInTheDocument()
    expect(screen.getByText('Every time, waits 5 s')).toBeInTheDocument()
    expect(screen.getByText('Opens https://example.com/brunch')).toBeInTheDocument()
    expect(screen.getByText('Pop-up (tall)')).toBeInTheDocument()
    await user.click(screen.getByRole('switch', { name: 'Show on the menu' }))
    await user.click(screen.getByRole('button', { name: 'Add offer' }))

    await waitFor(() => expect(mock.history.post.some((r) => r.url === '/api/offers')).toBe(true))
    expect(sent('post')).toMatchObject({
      placements: ['banner', 'popup'],
      banner_shape: 'rectangle',
      popup_shape: 'tall',
      delay_seconds: 5,
      action: 'link',
      action_url: 'https://example.com/brunch',
      starts_at: '2026-11-01T00:00',
      time_windows: [{ from: '22:00', to: '19:00' }],
      is_active: false,
    })
  })

  it('opens the step the server refused, and says a save failed', async () => {
    stub([])
    mock.onPost('/api/offers').reply(422, {
      message: 'An offer without text needs a picture.',
      code: 'validation_failed',
      errors: {
        image_key: ['An offer without text needs a picture.'],
        weekdays: ['Pick a day.'],
      },
    })
    const user = userEvent.setup()
    renderWithProviders(<OffersPage locale="en" onOpenCategories={vi.fn()} />)

    await startNew(user, 'One more')
    await next(user)
    await next(user)
    await next(user)
    await user.click(screen.getByRole('button', { name: 'Add offer' }))

    expect(await screen.findByText('Could not add that offer')).toBeInTheDocument()
    // The picture's step comes first, with the server's words under the picture.
    expect(
      await screen.findByRole('heading', { level: 3, name: 'Picture and text' }),
    ).toBeInTheDocument()
    expect(screen.getAllByText('An offer without text needs a picture.').length).toBeGreaterThan(0)
  })

  it('asks for dishes first when the menu has none', async () => {
    stub([])
    mock
      .onGet('/api/dishes')
      .reply(200, { data: [], meta: { used: 0, limit: null, currency: 'USD' } })
    const user = userEvent.setup()
    renderWithProviders(<OffersPage locale="en" onOpenCategories={vi.fn()} />)

    await startNew(user)
    await next(user)
    await giveDiscount(user)
    // A discount's tap shows its dishes to start.
    expect(screen.getByRole('tab', { name: 'Show its dishes' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(await screen.findByText('Add dishes to your menu first.')).toBeInTheDocument()
  })

  it('opens an offer from its card, and keeps it when a delete is cancelled', async () => {
    stub([makeOffer({ discount_type: 'percent', discount_value: '10.00', dish_ids: [7, 8] })])
    const user = userEvent.setup()
    renderWithProviders(<OffersPage locale="en" onOpenCategories={vi.fn()} />)

    await user.click(await screen.findByText('Happy hour'))
    expect(screen.getByRole('heading', { level: 2, name: 'Edit offer' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^Step 3: What guests get/ }))
    // Unticking a dish takes it off the offer.
    await user.click(await screen.findByRole('checkbox', { name: /Shish taouk/ }))
    expect(screen.getByRole('checkbox', { name: /Shish taouk/ })).toHaveAttribute(
      'aria-checked',
      'false',
    )
    expect(screen.getByText('1 chosen')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Back to your offers' }))
    await user.click(
      within(screen.getByRole('dialog', { name: 'Leave without saving?' })).getByRole('button', {
        name: 'Leave',
      }),
    )

    await user.click(await screen.findByRole('button', { name: 'Delete Happy hour' }))
    await user.click(
      within(screen.getByRole('dialog', { name: 'Delete this offer?' })).getByRole('button', {
        name: 'Cancel',
      }),
    )
    expect(mock.history.delete).toHaveLength(0)
  })

  it('reviews a saved short ad, and says when a save fails', async () => {
    stub([
      makeOffer({
        placements: ['ad'],
        image_url: 'https://cdn.test/o.webp',
        discount_type: 'amount',
        discount_value: '2.00',
        dish_ids: [7],
      }),
    ])
    mock.onPatch('/api/offers/1').reply(500, { message: 'Down', code: 'server_error' })
    const user = userEvent.setup()
    renderWithProviders(<OffersPage locale="en" onOpenCategories={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'Edit Happy hour' }))
    await user.click(screen.getByRole('button', { name: /^Step 5: Review/ }))
    expect(screen.getByText('A picture with a title and text')).toBeInTheDocument()
    expect(screen.getByText('$2.00 off on 1 dish')).toBeInTheDocument()
    expect(screen.getAllByText('Short ad')).toHaveLength(2)
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Save offer' }))
    expect(await screen.findByText('Could not save that offer')).toBeInTheDocument()
    expect(stepHeading('Review')).toBeInTheDocument()
  })

  it('turns an offer into a picture alone, which needs its picture', async () => {
    stub([
      makeOffer({ image_url: 'https://cdn.test/promo.webp' }),
      makeOffer({
        id: 2,
        title: { en: null },
        show_text: false,
        image_url: 'https://cdn.test/p.webp',
      }),
    ])
    mock.onPatch('/api/offers/1').reply(200, { data: makeOffer() })
    const user = userEvent.setup()
    const { container } = renderWithProviders(<OffersPage locale="en" onOpenCategories={vi.fn()} />)

    // A picture alone with no title is named for what it is.
    expect(await screen.findByText('Picture only')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Edit Happy hour' }))
    await user.click(screen.getByRole('switch', { name: 'Write a title and text on it' }))
    expect(screen.queryByLabelText(/^Title/)).toBeNull()
    expect(screen.getByText(/^Guests see this picture alone and tap it\./)).toBeInTheDocument()

    // Its shapes are drawn with its own picture.
    await user.click(screen.getByRole('button', { name: /^Step 2: Where and shape/ }))
    expect(
      container.querySelectorAll(
        '[aria-label="Banner shape"] img[src="https://cdn.test/promo.webp"]',
      ),
    ).toHaveLength(2)
    await user.click(screen.getByRole('button', { name: /^Step 5: Review/ }))
    expect(screen.getByText('The picture alone')).toBeInTheDocument()

    // Without its picture it would show nothing.
    await user.click(screen.getByRole('button', { name: /^Step 1: Picture and text/ }))
    await user.click(screen.getByRole('button', { name: /Remove/ }))
    await user.click(screen.getByRole('button', { name: 'Save offer' }))
    expect(
      await screen.findByText('Add a picture, or switch on the title and text.'),
    ).toBeInTheDocument()
    expect(mock.history.patch).toHaveLength(0)
  })

  it("shows each place's slots, and keeps a full one closed", async () => {
    stub([
      makeOffer({ id: 1, title: { en: 'Welcome' }, placements: ['popup'] }),
      makeOffer({
        id: 2,
        title: { en: 'Lunch' },
        placements: ['popup'],
        is_active: false,
        status: 'paused',
      }),
      makeOffer({ id: 3, title: { en: 'Old' }, placements: ['banner'], status: 'ended' }),
    ])
    const user = userEvent.setup()
    renderWithProviders(<OffersPage locale="en" onOpenCategories={vi.fn()} />)

    // Paused and ended offers take no slot.
    const slots = await screen.findByRole('list', { name: 'Switched on now' })
    expect(within(slots).getByText('Banners 0 of 3')).toBeInTheDocument()
    expect(within(slots).getByText('Pop-ups 1 of 1')).toBeInTheDocument()
    expect(within(slots).getByText('Short ads 0 of 1')).toBeInTheDocument()

    // Switching the paused pop-up on would make two: refused at once.
    await user.click(screen.getByRole('switch', { name: 'Show Lunch on the menu' }))
    expect(
      await screen.findByText('No free pop-up: pause or end the other pop-up first.'),
    ).toBeInTheDocument()
    expect(mock.history.patch).toHaveLength(0)
    expect(screen.getByRole('switch', { name: 'Show Lunch on the menu' })).not.toBeChecked()

    // A new offer cannot take the pop-up; the live one keeps its own.
    await user.click(screen.getByRole('button', { name: 'New offer' }))
    await user.type(screen.getByLabelText(/^Title/), 'Brunch')
    await next(user)
    const popup = await screen.findByRole('button', { name: /^Pop-up/ })
    expect(popup).toBeDisabled()
    expect(popup).toHaveTextContent('All in use: pause or end one first')
    expect(screen.getByRole('button', { name: /^Banner/ })).toHaveTextContent('0 of 3 in use')
    await user.click(screen.getByRole('button', { name: 'Back to your offers' }))
    await user.click(await screen.findByRole('button', { name: 'Leave' }))

    await user.click(await screen.findByRole('button', { name: 'Edit Welcome' }))
    await user.click(screen.getByRole('button', { name: /^Step 2: Where and shape/ }))
    expect(screen.getByRole('button', { name: /^Pop-up/ })).toBeEnabled()
    expect(screen.getByRole('button', { name: /^Pop-up/ })).toHaveTextContent('1 of 1 in use')
  })

  it('says on each card what may go wrong on the menu', async () => {
    mock.onGet('/api/dishes').reply(200, {
      data: [
        kafta,
        taouk,
        makeDish({ id: 9, name: { en: 'Old soup', ar: null }, is_available: false }),
      ],
      meta: { used: 3, limit: null, currency: 'USD' },
    })
    stub([
      makeOffer({ id: 1, title: { en: 'Welcome' }, placements: ['popup'] }),
      makeOffer({ id: 2, title: { en: 'Later' }, placements: ['ad'] }),
      makeOffer({
        id: 3,
        title: { en: 'Gone' },
        discount_type: 'percent',
        discount_value: '10.00',
      }),
      makeOffer({ id: 4, title: { en: 'Soup' }, action: 'dishes', dish_ids: [9] }),
      makeOffer({
        id: 5,
        title: { en: 'Big' },
        discount_type: 'amount',
        discount_value: '10.00',
        dish_ids: [7, 8],
      }),
    ])
    renderWithProviders(<OffersPage locale="en" onOpenCategories={vi.fn()} />)

    expect(
      await screen.findByText(
        'Not shown for now: guests see one pop-up or short ad per visit, and Welcome comes first. Drag this card above it to show this one instead.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('No dishes left on it: choose its dishes again.')).toBeInTheDocument()
    expect(await screen.findByText('All its dishes are hidden from the menu.')).toBeInTheDocument()
    expect(
      screen.getByText('Does not apply to Shish taouk: the discount is not less than the price.'),
    ).toBeInTheDocument()
  })

  it('refuses a fixed amount that would take all of a chosen dish', async () => {
    stub([])
    const user = userEvent.setup()
    renderWithProviders(<OffersPage locale="en" onOpenCategories={vi.fn()} />)

    await startNew(user)
    await next(user)
    await giveDiscount(user)
    await user.click(screen.getByRole('tab', { name: 'Amount off' }))
    await user.type(screen.getByLabelText('Amount off'), '9')
    await user.click(screen.getByRole('checkbox', { name: /Shish taouk/ }))
    await user.click(screen.getByRole('checkbox', { name: /Kafta/ }))
    expect(screen.getByRole('checkbox', { name: /Shish taouk/ })).toHaveTextContent(
      /does not apply: costs less than the discount/,
    )
    expect(screen.getByText(priceLine('$12.50 becomes $3.50'))).toBeInTheDocument()

    await next(user)
    expect(
      await screen.findByText('Shish taouk costs $9.00: a discount must take off less than that.'),
    ).toBeInTheDocument()
    expect(stepHeading('What guests get')).toBeInTheDocument()
  })

  describe('dishes in two currencies', () => {
    beforeEach(() => {
      mock.onGet('/api/dishes').reply(200, {
        data: [
          makeDish({ id: 7, name: { en: 'Burger', ar: null }, price: '5.00', currency: 'USD' }),
          makeDish({ id: 8, name: { en: 'Tea', ar: null }, price: '450000.00', currency: 'LBP' }),
        ],
        meta: {
          used: 2,
          limit: null,
          currency: 'LBP',
          second_currency: 'USD',
          exchange_rate: '89000.0000000000',
        },
      })
    })

    function stubLbp(data: Offer[]) {
      mock.onGet('/api/offers').reply(200, {
        data,
        meta: {
          limit: 30,
          slots: SLOTS,
          timezone: 'Asia/Beirut',
          currency: 'LBP',
          second_currency: 'USD',
          exchange_rate: '89000.0000000000',
          stats: {},
        },
      })
    }

    it('prices each dish in its own currency, the amount off at the rate', async () => {
      stubLbp([])
      const user = userEvent.setup()
      renderWithProviders(<OffersPage locale="en" onOpenCategories={vi.fn()} />)

      await startNew(user)
      await next(user)
      await giveDiscount(user)
      await user.click(screen.getByRole('tab', { name: 'Amount off' }))
      expect(await screen.findByRole('checkbox', { name: /Burger/ })).toHaveTextContent('$5.00')
      await user.type(screen.getByLabelText('Amount off'), '300000')
      await user.click(screen.getByRole('checkbox', { name: /Burger/ }))
      await user.click(screen.getByRole('checkbox', { name: /Tea/ }))

      // LBP 300,000 is $3.37 off the burger.
      expect(screen.getByText(priceLine('$5.00 becomes $1.63'))).toBeInTheDocument()
      expect(screen.getByText(priceLine(/^LBP\s450,000 becomes LBP\s150,000$/))).toBeInTheDocument()

      // $5.00 is LBP 445,000: an amount that big takes all of it, said in both.
      await user.clear(screen.getByLabelText('Amount off'))
      await user.type(screen.getByLabelText('Amount off'), '445000')
      await next(user)
      expect(
        await screen.findByText(
          /^Burger costs \$5\.00 \(LBP\s445,000\): a discount must take off less than that\.$/,
        ),
      ).toBeInTheDocument()
    })

    it('warns on a card when an amount takes all of a dish in the second currency', async () => {
      stubLbp([
        makeOffer({
          title: { en: 'Big' },
          discount_type: 'amount',
          discount_value: '445000.00',
          dish_ids: [7, 8],
        }),
      ])
      renderWithProviders(<OffersPage locale="en" onOpenCategories={vi.fn()} />)

      expect(
        await screen.findByText(
          'Does not apply to Burger: the discount is not less than the price.',
        ),
      ).toBeInTheDocument()
    })
  })

  it('says when a picture far from its shape shows whole on its blurred copy', async () => {
    // A tall picture, 600 wide and 1200 high, as the browser measures it.
    class TallPicture {
      naturalWidth = 600
      naturalHeight = 1200
      onload: (() => void) | null = null
      set src(_url: string) {
        queueMicrotask(() => this.onload?.())
      }
    }
    vi.stubGlobal('Image', TallPicture)
    stub([
      makeOffer({ image_url: 'https://cdn.test/tall.webp', placements: ['banner', 'ad'] }),
      makeOffer({
        id: 2,
        title: { en: null },
        show_text: false,
        image_url: 'https://cdn.test/tall.webp',
        placements: ['banner'],
      }),
    ])
    const user = userEvent.setup()
    renderWithProviders(<OffersPage locale="en" onOpenCategories={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'Edit Happy hour' }))
    await user.click(screen.getByRole('button', { name: /^Step 2: Where and shape/ }))
    expect(
      await screen.findByText(
        'Your picture is much taller than this shape: guests see it whole, on a soft blurred copy of itself at the sides. Square fits it best.',
      ),
    ).toBeInTheDocument()
    // The ad has no other shape to offer.
    expect(
      screen.getByText(
        'Your picture is much taller than this shape: guests see it whole, on a soft blurred copy of itself at the sides.',
      ),
    ).toBeInTheDocument()
    // A square banner fits it well enough.
    await user.click(
      within(screen.getByRole('group', { name: 'Banner shape' })).getByRole('button', {
        name: /^Square/,
      }),
    )
    expect(screen.queryByText(/Square fits it best/)).toBeNull()

    // A picture alone is never cut either.
    await user.click(screen.getByRole('button', { name: 'Back to your offers' }))
    await user.click(await screen.findByRole('button', { name: 'Leave' }))
    await user.click(await screen.findByRole('button', { name: 'Edit Picture only' }))
    await user.click(screen.getByRole('button', { name: /^Step 2: Where and shape/ }))
    expect(
      await screen.findByText(
        'Your picture is much taller than this shape: guests see it whole, on a soft blurred copy of itself at the sides. Square fits it best.',
      ),
    ).toBeInTheDocument()
    vi.unstubAllGlobals()
  })

  it('shows and keeps to only the parts of offers the package has', async () => {
    mock.onGet('/api/user').reply(200, {
      data: makeSessionUser({
        languages: ['en'],
        plan: { ...FULL_PLAN, offer_schedules: false, offer_discounts: false },
      }),
    })
    stub(
      [
        makeOffer({
          id: 1,
          title: { en: 'Sundays' },
          status: 'off',
          kept_off: 'schedules',
          repeat: 'weekly',
          weekdays: ['sun'],
        }),
        makeOffer({
          id: 2,
          title: { en: 'Grill deal' },
          placements: ['banner', 'popup'],
          discount_type: 'percent',
          discount_value: '20.00',
          dish_ids: [7],
        }),
        makeOffer({ id: 3, title: { en: 'Lunch ad' }, status: 'off', kept_off: 'places' }),
      ],
      {},
      30,
      { ...SLOTS, popup: { used: 0, limit: 0 } },
    )
    const user = userEvent.setup()
    renderWithProviders(<OffersPage locale="en" onOpenCategories={vi.fn()} />)

    expect((await screen.findAllByText('Off the menu')).length).toBe(2)
    expect(
      screen.getByText('Its places are not on your package: this offer stays off the menu.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Schedules are not on your package: this offer stays off the menu.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText("Pop-ups are not on your package: this offer doesn't show as one."),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Discounts are not on your package: this offer shows without its discount.'),
    ).toBeInTheDocument()
    // The slots line leaves out a place the package does not have.
    expect(screen.getByRole('list', { name: 'Switched on now' }).textContent).not.toMatch(/Pop-ups/)

    // A new offer: no pop-up, no discount, always on.
    await user.click(screen.getByRole('button', { name: 'New offer' }))
    await user.type(screen.getByLabelText(/^Title/), 'Lunch')
    await next(user)
    expect(screen.getByRole('button', { name: /Pop-up/ })).toBeDisabled()
    expect(screen.getAllByText('Not on your package').length).toBeGreaterThan(0)
    await next(user)
    await giveDiscount(user)
    expect(screen.getByRole('tab', { name: 'Percent off' })).toBeDisabled()
    // Without discounts, a discount on dishes is a tap showing them.
    expect(screen.getByRole('tab', { name: 'Show its dishes' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(
      screen.getByText('Discounts are not on your package: an offer is a promotion only.'),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: /Kafta/ }))
    await next(user)
    expect(await screen.findByRole('tab', { name: 'On a schedule' })).toBeDisabled()
    expect(
      screen.getByText('Schedules are not on your package: an offer is always on.'),
    ).toBeInTheDocument()
  })
})
