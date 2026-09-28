import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MoneyTimeSection } from '@/features/restaurant/components/hours/money-time-section'
import type { RestaurantFormValues } from '@/features/restaurant/schemas/restaurant.schema'

function Harness() {
  const form = useForm<RestaurantFormValues>({
    defaultValues: { currency: 'USD', timezone: 'UTC' },
  })
  return <MoneyTimeSection control={form.control} />
}

async function timezoneOptions(): Promise<string[]> {
  const user = userEvent.setup()
  render(<Harness />)
  await user.click(screen.getByRole('combobox', { name: /Timezone/ }))
  return (await screen.findAllByRole('option')).map((option) => option.textContent ?? '')
}

describe('MoneyTimeSection', () => {
  const original = Object.getOwnPropertyDescriptor(Intl, 'supportedValuesOf')

  afterEach(() => {
    vi.restoreAllMocks()
    if (original) Object.defineProperty(Intl, 'supportedValuesOf', original)
  })

  it('offers every timezone the browser knows, written with spaces', async () => {
    vi.spyOn(Intl, 'supportedValuesOf').mockReturnValue(['America/New_York', 'Asia/Beirut'])

    expect(await timezoneOptions()).toEqual(['America/New York', 'Asia/Beirut'])
  })

  it("falls back to the browser's own timezone and UTC when it lists none", async () => {
    vi.spyOn(Intl, 'supportedValuesOf').mockReturnValue([])
    const own = Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, ' ')

    expect(await timezoneOptions()).toEqual([own, 'UTC'])
  })

  it('falls back the same way on a browser without the list at all', async () => {
    Object.defineProperty(Intl, 'supportedValuesOf', { value: undefined, configurable: true })
    const own = Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, ' ')

    expect(await timezoneOptions()).toEqual([own, 'UTC'])
  })
})
