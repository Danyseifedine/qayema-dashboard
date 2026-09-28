import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm, useWatch } from 'react-hook-form'
import { afterEach, describe, expect, it } from 'vitest'
import { PhoneField } from '@/shared/components/forms/fields/phone-field'
import { i18n } from '@/lib/i18n'
import { COUNTRIES } from '@/shared/constants/countries'

type Values = { phone: string | null; country_code?: string | null }

function Harness({
  phone = '',
  country = 'LB',
}: {
  phone?: string | null
  country?: string | null
}) {
  const form = useForm<Values>({
    defaultValues: country === undefined ? { phone } : { phone, country_code: country },
  })
  const values = useWatch({ control: form.control })
  return (
    <>
      <PhoneField
        control={form.control}
        name="phone"
        countryName="country_code"
        label="Phone"
        hint="Guests call this."
        required
      />
      <output data-testid="value">{JSON.stringify(values)}</output>
      <button type="button" onClick={() => form.setError('phone', { message: 'Bad number.' })}>
        Break phone
      </button>
      <button
        type="button"
        onClick={() => form.setError('country_code', { message: 'Pick a country.' })}
      >
        Break country
      </button>
    </>
  )
}

const number = () => screen.getByRole('textbox', { name: /^Phone/ })
// The country picker is the only combobox; its name is in the dashboard's language.
const country = () => screen.getByRole('combobox')
const stored = () => JSON.parse(screen.getByTestId('value').textContent ?? '{}') as Values

describe('PhoneField', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('shows the country and the national number in one field', () => {
    render(<Harness phone="71234567" />)

    expect(screen.getByRole('combobox', { name: 'Country' })).toHaveValue('LB +961')
    expect(number()).toHaveValue('71234567')
    expect(number()).toHaveAttribute('type', 'tel')
    expect(number()).toHaveAttribute('dir', 'ltr')
    expect(number()).toHaveAttribute('placeholder', '71 234 567')
    expect(number()).toHaveAccessibleDescription('Guests call this.')
  })

  it('shows empty controls for a missing number and country', () => {
    render(<Harness phone={null} country={null} />)

    expect(number()).toHaveValue('')
    expect(country()).toHaveValue('')
  })

  it('writes the number and the country to their own fields', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.type(number(), '71000000')
    await user.click(country())
    await user.keyboard('egypt{Enter}')

    await waitFor(() => expect(stored()).toEqual({ phone: '71000000', country_code: 'EG' }))
  })

  it('finds a country by its name in the dashboard’s language', async () => {
    await i18n.changeLanguage('ar')
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(country())
    await user.keyboard('مصر')

    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(1))
    expect(screen.getByRole('option')).toHaveTextContent('EG +20')
  })

  it('falls back to the English country name when the copy has none', async () => {
    COUNTRIES.push({ code: 'ZZ', label: 'Zedland', flag: '🏳️', dial: '+999' })
    try {
      const user = userEvent.setup()
      render(<Harness />)

      await user.click(country())
      await user.keyboard('zedland')

      await waitFor(() => expect(screen.getByRole('option')).toHaveTextContent('Zedland'))
    } finally {
      COUNTRIES.pop()
    }
  })

  it('shows a number error and marks the field invalid', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Break phone' }))

    expect(await screen.findByText('Bad number.')).toBeInTheDocument()
    expect(number()).toHaveAttribute('aria-invalid', 'true')
  })

  it('shows a country error when the number has none', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Break country' }))

    expect(await screen.findByText('Pick a country.')).toBeInTheDocument()
    expect(number()).toHaveAccessibleDescription('Pick a country.')
  })
})
