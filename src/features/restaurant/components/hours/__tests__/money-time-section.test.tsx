import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm, useWatch } from 'react-hook-form'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MoneyTimeSection } from '@/features/restaurant/components/hours/money-time-section'
import type { RestaurantFormValues } from '@/features/restaurant/schemas/restaurant.schema'

function Harness({ timezone }: { timezone: string }) {
  const form = useForm<RestaurantFormValues>({
    defaultValues: { currency: 'USD', timezone },
  })
  return <MoneyTimeSection control={form.control} />
}

/** The section with a second currency, showing what the form holds for the rate. */
function Money({
  currency = 'LBP',
  second = '',
  rateOne = 'second',
  rate = null,
}: {
  currency?: string
  second?: string
  rateOne?: 'second' | 'main'
  rate?: number | null
}) {
  const form = useForm<RestaurantFormValues>({
    defaultValues: {
      currency,
      second_currency: second,
      rate_one: rateOne,
      rate,
      timezone: 'UTC',
    },
  })
  const kept = useWatch({ control: form.control, name: ['rate_one', 'rate'] })
  return (
    <>
      <MoneyTimeSection control={form.control} />
      <output>{JSON.stringify(kept)}</output>
      <button
        type="button"
        onClick={() => form.setError('rate', { message: 'Enter the exchange rate.' })}
      >
        Break
      </button>
    </>
  )
}

function held(): unknown {
  return JSON.parse(screen.getByRole('status').textContent ?? '')
}

async function timezoneOptions(saved = 'UTC'): Promise<string[]> {
  const user = userEvent.setup()
  render(<Harness timezone={saved} />)
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

    expect(await timezoneOptions('Asia/Beirut')).toEqual(['America/New York', 'Asia/Beirut'])
  })

  it('keeps the saved timezone when the browser does not list it, so it never shows empty', async () => {
    vi.spyOn(Intl, 'supportedValuesOf').mockReturnValue(['America/New_York', 'Asia/Kolkata'])

    expect(await timezoneOptions('Asia/Calcutta')).toEqual([
      'Asia/Calcutta',
      'America/New York',
      'Asia/Kolkata',
    ])
  })

  it('shows the saved timezone in the field even when the browser does not list it', () => {
    vi.spyOn(Intl, 'supportedValuesOf').mockReturnValue(['Asia/Kolkata'])
    render(<Harness timezone="UTC" />)

    expect(screen.getByRole('combobox', { name: /Timezone/ })).toHaveValue('UTC')
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

  describe('a second currency', () => {
    it('has none at first, and every currency but the main one to pick', async () => {
      const user = userEvent.setup()
      render(<Money />)

      const field = screen.getByRole('combobox', { name: /Second currency/ })
      expect(field).toHaveValue('None')
      expect(screen.getByText(/Guests still see one total in LBP/)).toBeInTheDocument()
      expect(screen.queryByText('Exchange rate')).not.toBeInTheDocument()

      await user.click(field)
      const options = screen.getAllByRole('option').map((option) => option.textContent)
      expect(options[0]).toBe('None')
      expect(options.some((option) => option?.startsWith('LBP'))).toBe(false)
      expect(options.some((option) => option?.startsWith('USD'))).toBe(true)
    })

    it('starts USD on 1 USD = 89,000 LBP', async () => {
      const user = userEvent.setup()
      render(<Money />)

      await user.click(screen.getByRole('combobox', { name: /Second currency/ }))
      await user.click(screen.getByRole('option', { name: /^USD/ }))

      expect(
        screen.getByText('Price some dishes in USD. Guests see one total in LBP.'),
      ).toBeInTheDocument()
      expect(screen.getByRole('spinbutton', { name: /Exchange rate/ })).toHaveValue(89000)
      expect(screen.getByText('1 USD =')).toBeInTheDocument()
      expect(held()).toEqual(['second', 89000])
    })

    it('leaves another pair empty, to be typed, and takes what is typed', async () => {
      const user = userEvent.setup()
      render(<Money currency="EUR" />)

      await user.click(screen.getByRole('combobox', { name: /Second currency/ }))
      await user.click(screen.getByRole('option', { name: /^USD/ }))
      const rate = screen.getByRole('spinbutton', { name: /Exchange rate/ })
      expect(rate).toHaveValue(null)

      await user.type(rate, '0.92')
      expect(held()).toEqual(['second', 0.92])
      await user.clear(rate)
      expect(held()).toEqual(['second', null])
    })

    it('turns the rate round when the other currency is made the 1', async () => {
      const user = userEvent.setup()
      render(<Money second="USD" rate={89000} />)

      const sides = screen.getByRole('tablist', { name: 'Which currency is 1' })
      // The one already chosen changes nothing.
      await user.click(within(sides).getByRole('tab', { name: '1 USD' }))
      expect(held()).toEqual(['second', 89000])

      await user.click(within(sides).getByRole('tab', { name: '1 LBP' }))
      expect(held()).toEqual(['main', 0.000011236])
      expect(screen.getByText('1 LBP =')).toBeInTheDocument()

      await user.click(within(sides).getByRole('tab', { name: '1 USD' }))
      expect(held()).toEqual(['second', 89000])
    })

    it('goes back to no rate when none is picked again', async () => {
      const user = userEvent.setup()
      render(<Money second="USD" rate={89000} />)

      await user.click(screen.getByRole('combobox', { name: /Second currency/ }))
      await user.click(screen.getByRole('option', { name: 'None' }))

      expect(screen.queryByRole('spinbutton', { name: /Exchange rate/ })).not.toBeInTheDocument()
      expect(held()).toEqual(['second', null])
    })

    it('shows a problem with the rate under it', async () => {
      const user = userEvent.setup()
      render(<Money second="USD" rate={null} />)

      await user.click(screen.getByRole('button', { name: 'Break' }))

      expect(await screen.findByText('Enter the exchange rate.')).toBeInTheDocument()
      expect(screen.getByRole('spinbutton', { name: /Exchange rate/ })).toHaveAttribute(
        'aria-invalid',
        'true',
      )
    })
  })
})
