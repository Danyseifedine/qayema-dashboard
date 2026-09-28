import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm, useWatch } from 'react-hook-form'
import { describe, expect, it } from 'vitest'
import { UrlField } from '@/shared/components/forms/fields/url-field'

type Values = { website: string }

function Harness({ placeholder, disabled }: { placeholder?: string; disabled?: boolean }) {
  const form = useForm<Values>({ defaultValues: { website: '' } })
  const website = useWatch({ control: form.control, name: 'website' })
  return (
    <>
      <UrlField
        control={form.control}
        name="website"
        label="Website"
        hint="Your own site."
        optionalText="Optional"
        placeholder={placeholder}
        disabled={disabled}
      />
      <output data-testid="value">{website}</output>
    </>
  )
}

const box = () => screen.getByRole('textbox', { name: /^Website/ })

describe('UrlField', () => {
  it('is a left-to-right URL box with a link icon', () => {
    const { container } = render(<Harness />)

    expect(box()).toHaveAttribute('type', 'url')
    expect(box()).toHaveAttribute('inputMode', 'url')
    expect(box()).toHaveAttribute('autoComplete', 'url')
    expect(box()).toHaveAttribute('dir', 'ltr')
    expect(box()).toHaveAttribute('placeholder', 'https://')
    expect(box()).toHaveAccessibleDescription('Your own site.')
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('writes what is typed into the form', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.type(box(), 'https://qayema.app')

    expect(screen.getByTestId('value')).toHaveTextContent('https://qayema.app')
  })

  it('takes its own placeholder and a disabled state', () => {
    render(<Harness placeholder="https://instagram.com/" disabled />)

    expect(box()).toHaveAttribute('placeholder', 'https://instagram.com/')
    expect(box()).toBeDisabled()
  })
})
