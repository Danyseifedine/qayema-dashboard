import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import type { ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useSession } from '@/features/auth'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { renderWithProviders } from '@/test/render-with-providers'
import { WHATSAPP_FIELDS_OFF, makeSessionUser } from '@/test/factories/session'
import { OrderingChoice } from '@/features/restaurant/components/features/ordering-choice'

let mock: MockAdapter

/** How orders come in, as the session sends it: table orders on the dashboard. */
const ORDERING = makeSessionUser().restaurant!.ordering

/** A tab of one choice: delivery and pickup's, or the table's. */
function tabOf(group: string, name: string) {
  return within(screen.getByRole('tablist', { name: group })).getByRole('tab', { name })
}

/** One of the "what to ask" choices: Name, Phone or Delivery address. */
function askTab(field: string, level: string) {
  return tabOf(`${field}: what to ask`, level)
}

/** How delivery and pickup come in (the table's choice has a WhatsApp too). */
function orderTab(name: string) {
  return tabOf('How guests send orders', name)
}

function choice(props: Partial<ComponentProps<typeof OrderingChoice>> = {}) {
  return <OrderingChoice ordering={ORDERING} whatsappIncluded menuIncluded {...props} />
}

/** The choice as the app mounts it: how orders come in read from the session cache. */
function FromSession() {
  const restaurant = useSession().data?.restaurant
  if (!restaurant) return null
  return (
    <OrderingChoice
      ordering={restaurant.ordering}
      whatsappIncluded={restaurant.plan.ordering}
      menuIncluded={restaurant.plan.menu_ordering}
    />
  )
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

describe('OrderingChoice', () => {
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

  it('chooses ordering in the menu, with both kinds of order', async () => {
    mock.onPut('/api/features/ordering').reply(200, {
      data: { mode: 'menu', types: ['delivery', 'pickup'] },
    })
    const user = userEvent.setup()
    renderWithProviders(choice())

    expect(screen.getByText(/won't appear on your Orders page/)).toBeInTheDocument()
    await user.click(orderTab('Dashboard'))

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
    renderWithProviders(
      choice({ ordering: { ...ORDERING, mode: 'menu', types: ['delivery', 'pickup'] } }),
    )

    expect(screen.getByText(/Orders appear on your Orders page with a sound/)).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Delivery' })).toHaveAttribute('aria-checked', 'true')
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
    renderWithProviders(choice({ ordering: { ...ORDERING, mode: 'menu', types: ['delivery'] } }))

    expect(screen.getByRole('switch', { name: 'Pickup' })).toHaveAttribute('aria-checked', 'false')
    await user.click(screen.getByRole('switch', { name: 'Pickup' }))

    await waitFor(() => expect(mock.history.put).toHaveLength(1))
    expect(JSON.parse(mock.history.put[0]!.data as string)).toEqual({
      mode: 'menu',
      types: ['delivery', 'pickup'],
    })
  })

  it('saves nothing when the way already chosen is picked again', async () => {
    const user = userEvent.setup()
    renderWithProviders(choice())

    await user.click(orderTab('WhatsApp'))

    expect(orderTab('WhatsApp')).toHaveAttribute('aria-selected', 'true')
    expect(mock.history.put).toHaveLength(0)
  })

  it('keeps the last kind of order on, so guests can always order', () => {
    renderWithProviders(choice({ ordering: { ...ORDERING, mode: 'menu', types: ['pickup'] } }))

    expect(screen.getByRole('switch', { name: 'Pickup' })).toBeDisabled()
    expect(screen.getByRole('switch', { name: 'Delivery' })).toBeEnabled()
    // Ordering at the table is its own feature, not one of these.
    expect(screen.queryByRole('switch', { name: 'At the table' })).not.toBeInTheDocument()
  })

  it('asks nothing about delivery while orders go to WhatsApp', () => {
    renderWithProviders(choice())

    expect(orderTab('WhatsApp')).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByRole('group', { name: 'You take' })).not.toBeInTheDocument()
  })

  it('leaves out ordering in the menu without the package, naming the only way', () => {
    renderWithProviders(choice({ menuIncluded: false }))

    expect(
      screen.queryByRole('tablist', { name: 'How guests send orders' }),
    ).not.toBeInTheDocument()
    expect(screen.getByText('WhatsApp')).toBeInTheDocument()
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
  })

  it('leaves out WhatsApp when the package only has orders in the menu', () => {
    renderWithProviders(
      choice({ ordering: { ...ORDERING, mode: 'menu' }, whatsappIncluded: false }),
    )

    expect(
      screen.queryByRole('tablist', { name: 'How guests send orders' }),
    ).not.toBeInTheDocument()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.queryByText('WhatsApp')).not.toBeInTheDocument()
  })

  it('moves at once, and snaps back with a reason when the save fails', async () => {
    mock.onGet('/api/user').reply(200, {
      data: makeSessionUser({
        ordering: { ...ORDERING, mode: 'whatsapp', types: ['delivery', 'pickup'] },
      }),
    })
    const answer = held()
    mock.onPut('/api/features/ordering').reply(answer.reply)
    const user = userEvent.setup()
    renderWithProviders(<FromSession />)

    await user.click(await screen.findByRole('tab', { name: 'Dashboard' }))
    expect(orderTab('Dashboard')).toHaveAttribute('aria-selected', 'true')

    answer.release([500, { message: 'Server down', code: 'server_error' }])
    await waitFor(() => expect(orderTab('WhatsApp')).toHaveAttribute('aria-selected', 'true'))
    // The toaster outlives a test, so the one before may still show its own.
    expect((await screen.findAllByText('Could not update your features')).length).toBeGreaterThan(0)
    expect(mock.history.put).toHaveLength(1)
  })

  it('asks for a name, a phone and an address only while orders go to WhatsApp', () => {
    const { unmount } = renderWithProviders(choice())

    const group = screen.getByRole('group', { name: 'Ask guests for' })
    expect(
      within(group)
        .getAllByRole('tablist')
        .map((list) => list.getAttribute('aria-label')),
    ).toEqual(['Name: what to ask', 'Phone: what to ask', 'Delivery address: what to ask'])
    expect(askTab('Name', 'Off')).toHaveAttribute('aria-selected', 'true')
    expect(within(group).getByText(/before WhatsApp opens/)).toBeInTheDocument()
    expect(within(group).getByText(/The address is only asked for delivery/)).toBeInTheDocument()
    unmount()

    renderWithProviders(choice({ ordering: { ...ORDERING, mode: 'menu' } }))
    expect(screen.queryByRole('group', { name: 'Ask guests for' })).not.toBeInTheDocument()
  })

  it('lets guests choose delivery or pickup once the address is asked', async () => {
    mock.onGet('/api/user').reply(200, { data: makeSessionUser({ ordering: ORDERING }) })
    mock.onPut('/api/features/whatsapp-fields').reply(200, {
      data: {
        ...WHATSAPP_FIELDS_OFF,
        away: { ...WHATSAPP_FIELDS_OFF.away, address: 'optional' },
      },
    })
    mock.onPut('/api/features/ordering').reply(200, {
      data: { mode: 'whatsapp', types: ['delivery'] },
    })
    const user = userEvent.setup()
    renderWithProviders(<FromSession />)

    await screen.findByRole('group', { name: 'Ask guests for' })
    expect(screen.queryByRole('group', { name: 'You take' })).not.toBeInTheDocument()
    await user.click(askTab('Delivery address', 'Optional'))

    const types = await screen.findByRole('group', { name: 'You take' })
    expect(within(types).getByText('Guests give their address.')).toBeInTheDocument()
    await user.click(within(types).getByRole('switch', { name: 'Pickup' }))

    await waitFor(() => expect(mock.history.put).toHaveLength(2))
    expect(mock.history.put[1]!.url).toBe('/api/features/ordering')
    expect(JSON.parse(mock.history.put[1]!.data as string)).toEqual({
      mode: 'whatsapp',
      types: ['delivery'],
    })
  })
})
