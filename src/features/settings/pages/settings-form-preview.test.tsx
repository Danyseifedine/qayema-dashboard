import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { SettingsFormPreview } from './settings-form-preview'

describe('SettingsFormPreview', () => {
  it('renders every control in the form library', () => {
    render(<SettingsFormPreview />)

    // Text, translatable, textarea
    expect(screen.getByLabelText(/^Name/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Tagline/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Internal note/)).toBeInTheDocument()

    // Phone splits into a country combobox plus a number
    expect(screen.getByRole('combobox', { name: 'Country' })).toBeInTheDocument()
    expect(screen.getByLabelText(/^Phone/)).toBeInTheDocument()

    // Currency is a searchable combobox; query it by role so the assertion
    // also pins the role, not just the label.
    expect(screen.getByRole('combobox', { name: /Currency/ })).toBeInTheDocument()
    expect(screen.getByLabelText(/^Sample dish price/)).toBeInTheDocument()
    // The colour field exposes both a hex input and a native picker.
    expect(screen.getByLabelText('Accent colour')).toHaveValue('#F8D38D')
    expect(screen.getByLabelText('Accent colour picker')).toBeInTheDocument()

    // Radio group
    expect(screen.getByRole('radio', { name: /English/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /العربية/ })).not.toBeChecked()

    // Switch and checkbox
    expect(screen.getByRole('switch', { name: /Menu is live/ })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /confirm these details/ })).toBeInTheDocument()

    // Both dropzones
    expect(screen.getAllByText(/Drop an image or/)).toHaveLength(2)
  })

  it('finds a currency by typing its name, not just its code', async () => {
    const user = userEvent.setup()
    render(<SettingsFormPreview />)

    const currency = screen.getByRole('combobox', { name: /Currency/ })
    await user.click(currency)
    // The field already shows USD, so the existing text is replaced.
    await user.clear(currency)
    await user.type(currency, 'lebanese')

    // 142 currencies; searching the description is the only way to find one.
    const option = await screen.findByRole('option', { name: /Lebanese Pound/ })
    await user.click(option)

    await waitFor(() => expect(currency).toHaveValue('LBP'))
  })

  it('shows the schema errors when an empty form is submitted', async () => {
    const user = userEvent.setup()
    render(<SettingsFormPreview />)

    await user.click(screen.getByRole('button', { name: /Save changes/ }))

    expect(await screen.findByText('This must be at least 2 characters.')).toBeInTheDocument()
    expect(await screen.findByText('A phone number is required.')).toBeInTheDocument()
    expect(await screen.findByText('A logo is required.')).toBeInTheDocument()
    expect(
      await screen.findByText('Please confirm these details before saving.'),
    ).toBeInTheDocument()
  })

  it('places a Laravel 422 on the field it names', async () => {
    const user = userEvent.setup()
    render(<SettingsFormPreview />)

    await user.click(screen.getByRole('button', { name: /Simulate a server error/ }))

    // `phone` maps straight onto its field.
    expect(
      await screen.findByText('Please enter a valid phone number using digits only.'),
    ).toBeInTheDocument()

    // `name.ar` belongs to the hidden Arabic tab, so it surfaces as a prefixed
    // note under the English control rather than disappearing.
    expect(await screen.findByText(/العربية: The Arabic name is required\./)).toBeInTheDocument()
  })

  it('switches a translatable field between English and Arabic', async () => {
    const user = userEvent.setup()
    render(<SettingsFormPreview />)

    const nameField = screen.getByLabelText(/^Name/)
    expect(nameField).toHaveAttribute('dir', 'ltr')

    await user.type(nameField, 'Beit Qayema')

    const [arabicTab] = screen.getAllByRole('tab', { name: /AR/ })
    await user.click(arabicTab!)

    await waitFor(() => {
      expect(screen.getByLabelText(/^Name/)).toHaveAttribute('dir', 'rtl')
    })
    // The English text is kept, not cleared, when the tab changes back.
    expect(screen.getByLabelText(/^Name/)).toHaveValue('')
  })
})
