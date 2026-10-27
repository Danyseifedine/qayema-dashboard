import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useSession } from '@/features/auth'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { renderWithProviders } from '@/test/render-with-providers'
import { WHATSAPP_FIELDS_OFF, makeSessionUser } from '@/test/factories/session'
import { AskGuestsFor } from '@/features/restaurant/components/features/ask-guests-for'

let mock: MockAdapter

/** A tab of one choice: delivery and pickup's, or the table's. */
function tabOf(group: string, name: string) {
  return within(screen.getByRole('tablist', { name: group })).getByRole('tab', { name })
}

/** One of the "what to ask" choices: Name, Phone or Delivery address. */
function askTab(field: string, level: string) {
  return tabOf(`${field}: what to ask`, level)
}

/** Delivery and pickup's set as the app mounts it: read from the session cache. */
function FromSession() {
  const restaurant = useSession().data?.restaurant
  if (!restaurant) return null
  return <AskGuestsFor set="away" fields={restaurant.ordering.whatsapp_fields} />
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

describe('AskGuestsFor', () => {
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

  it('saves the whole set when one is changed', async () => {
    const saved = {
      away: { name: 'required', phone: 'off', address: 'off' },
      table: { name: 'off', phone: 'off' },
    }
    mock.onPut('/api/features/whatsapp-fields').reply(200, { data: saved })
    const user = userEvent.setup()
    renderWithProviders(<AskGuestsFor set="away" fields={WHATSAPP_FIELDS_OFF} />)

    await user.click(askTab('Name', 'Required'))

    await waitFor(() => expect(mock.history.put).toHaveLength(1))
    expect(mock.history.put[0]!.url).toBe('/api/features/whatsapp-fields')
    expect(JSON.parse(mock.history.put[0]!.data as string)).toEqual(saved)
  })

  it('saves nothing when the level already chosen is picked again', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AskGuestsFor set="away" fields={WHATSAPP_FIELDS_OFF} />)

    await user.click(askTab('Phone', 'Off'))

    expect(askTab('Phone', 'Off')).toHaveAttribute('aria-selected', 'true')
    expect(mock.history.put).toHaveLength(0)
  })

  it('moves at once, and snaps back with a reason when the save fails', async () => {
    mock.onGet('/api/user').reply(200, { data: makeSessionUser() })
    const answer = held()
    mock.onPut('/api/features/whatsapp-fields').reply(answer.reply)
    const user = userEvent.setup()
    renderWithProviders(<FromSession />)

    await screen.findByRole('group', { name: 'Ask guests for' })
    await user.click(askTab('Name', 'Required'))
    expect(askTab('Name', 'Required')).toHaveAttribute('aria-selected', 'true')

    answer.release([500, { message: 'Server down', code: 'server_error' }])
    await waitFor(() => expect(askTab('Name', 'Off')).toHaveAttribute('aria-selected', 'true'))
    expect((await screen.findAllByText('Could not update your features')).length).toBeGreaterThan(0)
  })
})
