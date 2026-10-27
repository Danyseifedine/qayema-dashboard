import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import type { ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSession } from '@/features/auth'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { renderWithProviders } from '@/test/render-with-providers'
import { WHATSAPP_FIELDS_OFF, makeSessionUser } from '@/test/factories/session'
import { DineInChoice } from '@/features/restaurant/components/features/dine-in-choice'

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

function choice(props: Partial<ComponentProps<typeof DineInChoice>> = {}) {
  return (
    <DineInChoice
      ordering={ORDERING}
      menuIncluded
      whatsappIncluded
      onOpenRestaurant={() => {}}
      {...props}
    />
  )
}

/** The choice as the app mounts it: how orders come in read from the session cache. */
function FromSession() {
  const restaurant = useSession().data?.restaurant
  if (!restaurant) return null
  return (
    <DineInChoice
      ordering={restaurant.ordering}
      menuIncluded={restaurant.plan.dine_in}
      whatsappIncluded={restaurant.plan.dine_in_whatsapp}
      onOpenRestaurant={() => {}}
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

describe('DineInChoice', () => {
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

  it('asks table guests for a name and a phone only while table orders go to WhatsApp', async () => {
    mock.onPut('/api/features/whatsapp-fields').reply(200, {
      data: { ...WHATSAPP_FIELDS_OFF, table: { name: 'off', phone: 'optional' } },
    })
    const user = userEvent.setup()
    const { unmount } = renderWithProviders(choice({ ordering: { ...ORDERING, mode: 'menu' } }))
    expect(screen.queryByRole('group', { name: 'Ask guests for' })).not.toBeInTheDocument()
    unmount()

    renderWithProviders(choice({ ordering: { ...ORDERING, mode: 'menu', dine_in: 'whatsapp' } }))
    const group = screen.getByRole('group', { name: 'Ask guests for' })
    expect(
      within(group)
        .getAllByRole('tablist')
        .map((list) => list.getAttribute('aria-label')),
    ).toEqual(['Name: what to ask', 'Phone: what to ask'])
    await user.click(askTab('Phone', 'Optional'))

    await waitFor(() => expect(mock.history.put).toHaveLength(1))
    expect(JSON.parse(mock.history.put[0]!.data as string)).toEqual({
      away: { name: 'off', phone: 'off', address: 'off' },
      table: { name: 'off', phone: 'optional' },
    })
  })

  it('saves nothing when the way already chosen is picked again', async () => {
    const user = userEvent.setup()
    renderWithProviders(choice())

    await user.click(tabOf('Where table orders go', 'Dashboard'))

    expect(mock.history.put).toHaveLength(0)
  })

  it('leaves out a table way the package does not have', () => {
    renderWithProviders(choice({ whatsappIncluded: false }))

    expect(screen.queryByRole('tablist', { name: 'Where table orders go' })).not.toBeInTheDocument()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.queryByText('WhatsApp')).not.toBeInTheDocument()
  })

  it('names WhatsApp alone when table orders only go there', () => {
    renderWithProviders(
      choice({ ordering: { ...ORDERING, dine_in: 'whatsapp' }, menuIncluded: false }),
    )

    expect(screen.queryByRole('tablist', { name: 'Where table orders go' })).not.toBeInTheDocument()
    expect(screen.getByText('WhatsApp')).toBeInTheDocument()
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
  })

  it('waits for a number before WhatsApp, with the way to add one', async () => {
    const onOpenRestaurant = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(
      choice({ ordering: { ...ORDERING, whatsapp_number: false }, onOpenRestaurant }),
    )

    expect(tabOf('Where table orders go', 'WhatsApp')).toBeDisabled()
    expect(screen.getByText(/WhatsApp needs your restaurant's phone number/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add it on the Restaurant page' }))
    expect(onOpenRestaurant).toHaveBeenCalledOnce()
  })

  it('says table orders stay here while WhatsApp has no number, and can move back', async () => {
    mock.onPut('/api/features/dine-in').reply(200, { data: { dine_in: 'menu' } })
    const user = userEvent.setup()
    renderWithProviders(
      choice({ ordering: { ...ORDERING, dine_in: 'whatsapp', whatsapp_number: false } }),
    )

    expect(screen.getByText(/so table orders come to your dashboard/)).toBeInTheDocument()
    expect(tabOf('Where table orders go', 'WhatsApp')).toBeEnabled()
    await user.click(tabOf('Where table orders go', 'Dashboard'))

    await waitFor(() => expect(mock.history.put).toHaveLength(1))
    expect(JSON.parse(mock.history.put[0]!.data as string)).toEqual({ mode: 'menu' })
  })

  it('moves at once, and snaps back with a reason when the save fails', async () => {
    mock.onGet('/api/user').reply(200, { data: makeSessionUser() })
    const answer = held()
    mock.onPut('/api/features/dine-in').reply(answer.reply)
    const user = userEvent.setup()
    renderWithProviders(<FromSession />)

    await screen.findByRole('tablist', { name: 'Where table orders go' })
    await user.click(tabOf('Where table orders go', 'WhatsApp'))
    expect(tabOf('Where table orders go', 'WhatsApp')).toHaveAttribute('aria-selected', 'true')

    answer.release([
      422,
      {
        message: 'Add your WhatsApp number on the Restaurant page first.',
        code: 'validation_failed',
      },
    ])
    await waitFor(() =>
      expect(tabOf('Where table orders go', 'Dashboard')).toHaveAttribute('aria-selected', 'true'),
    )
    expect((await screen.findAllByText('Could not update your features')).length).toBeGreaterThan(0)
  })
})
