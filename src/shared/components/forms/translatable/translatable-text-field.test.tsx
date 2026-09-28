import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm, useWatch } from 'react-hook-form'
import { describe, expect, it } from 'vitest'
import {
  TranslatableTextField,
  type TranslatableFieldProps,
} from '@/shared/components/forms/translatable/translatable-text-field'

type Values = { name?: Record<string, string | null> }

const BLANK = { en: '', fr: '' }
const EN_FR = ['en', 'fr']

function Harness({
  initial = BLANK,
  languages = EN_FR,
  replaceWith,
  ...props
}: {
  initial?: Record<string, string | null> | undefined
  /** What the form is later reset to, as after loading other data. */
  replaceWith?: Record<string, string> | undefined
} & Partial<TranslatableFieldProps<Values>>) {
  const form = useForm<Values>({ defaultValues: initial === undefined ? {} : { name: initial } })
  const name = useWatch({ control: form.control, name: 'name' })
  return (
    <>
      <TranslatableTextField
        control={form.control}
        name="name"
        label="Name"
        languages={languages}
        {...props}
      />
      <output data-testid="value">{JSON.stringify(name ?? null)}</output>
      <button type="button" onClick={() => form.setError('name.en', { message: 'Name it.' })}>
        Break English
      </button>
      <button type="button" onClick={() => form.setError('name.fr', { message: 'Too long.' })}>
        Break French
      </button>
      <button
        type="button"
        onClick={() => form.reset(replaceWith === undefined ? {} : { name: replaceWith })}
      >
        Replace
      </button>
    </>
  )
}

const control = () => screen.getByRole('textbox')
const tab = (code: string) => screen.getByRole('tab', { name: new RegExp(`^${code}`) })

describe('TranslatableTextField', () => {
  it('shows no tabs for an English-only menu', () => {
    render(<Harness languages={['en']} initial={{ en: 'Soup' }} />)

    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Soup')
    expect(control()).toHaveAttribute('lang', 'en')
    expect(control()).toHaveAttribute('dir', 'ltr')
  })

  it('opens on English and switches language by tab', async () => {
    const user = userEvent.setup()
    render(<Harness languages={['en', 'ar']} initial={{ en: 'Soup', ar: 'شوربة' }} />)

    expect(control()).toHaveValue('Soup')
    expect(tab('EN')).toHaveAttribute('aria-selected', 'true')

    await user.click(tab('AR'))

    expect(control()).toHaveValue('شوربة')
    expect(control()).toHaveAttribute('lang', 'ar')
    expect(control()).toHaveAttribute('dir', 'rtl')
    expect(control()).toHaveAttribute('id', 'name-ar')
  })

  it('writes typing into the active language only', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.type(control(), 'Soup')
    await user.click(tab('FR'))
    await user.type(control(), 'Soupe')

    expect(JSON.parse(screen.getByTestId('value').textContent ?? '')).toEqual({
      en: 'Soup',
      fr: 'Soupe',
    })
  })

  it('shows a null value as empty', () => {
    render(<Harness initial={{ en: null, fr: null }} />)

    expect(control()).toHaveValue('')
  })

  it('shows each language’s own placeholder', async () => {
    const user = userEvent.setup()
    render(<Harness placeholder={{ en: 'e.g. Soup', fr: 'ex. Soupe' }} />)

    expect(control()).toHaveAttribute('placeholder', 'e.g. Soup')
    await user.click(tab('FR'))
    expect(control()).toHaveAttribute('placeholder', 'ex. Soupe')
  })

  it('marks English on a required field until it has text', async () => {
    const user = userEvent.setup()
    render(<Harness required optionalText="Optional" />)

    expect(tab('EN')).toHaveTextContent('EN•')
    expect(tab('FR')).toHaveTextContent(/^FR$/)
    expect(screen.getByText('*')).toBeInTheDocument()

    await user.type(control(), 'Soup')
    expect(tab('EN')).toHaveTextContent(/^EN$/)
  })

  it('marks English as missing when the whole value is unset', () => {
    render(<Harness initial={undefined} required />)

    expect(tab('EN')).toHaveTextContent('EN•')
    expect(control()).toHaveValue('')
  })

  it('describes the control with its hint', () => {
    render(<Harness hint="As guests see it." />)

    expect(control()).toHaveAccessibleDescription('As guests see it.')
  })

  it('shows the active language’s error in place of the hint', async () => {
    const user = userEvent.setup()
    render(<Harness hint="As guests see it." />)

    await user.click(screen.getByRole('button', { name: 'Break English' }))

    expect(await screen.findByText('Name it.')).toBeInTheDocument()
    expect(control()).toHaveAttribute('aria-invalid', 'true')
    expect(control()).toHaveAccessibleDescription('Name it.')
    expect(screen.queryByText('As guests see it.')).not.toBeInTheDocument()
    expect(tab('EN')).toHaveTextContent('EN•')
  })

  it('surfaces an error on a hidden language under the control', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Break French' }))

    expect(await screen.findByText('French: Too long.')).toBeInTheDocument()
    expect(tab('FR')).toHaveTextContent('FR•')
    expect(control()).not.toHaveAttribute('aria-invalid')

    // Once on that tab, the error is the control's own.
    await user.click(tab('FR'))
    expect(screen.getByText('Too long.')).toBeInTheDocument()
    expect(screen.queryByText('French: Too long.')).not.toBeInTheDocument()
  })

  it('shows the active error rather than a hidden one', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Break French' }))
    await user.click(screen.getByRole('button', { name: 'Break English' }))

    expect(await screen.findByText('Name it.')).toBeInTheDocument()
    expect(screen.queryByText('French: Too long.')).not.toBeInTheDocument()
  })

  it('counts characters against the maximum', async () => {
    const user = userEvent.setup()
    render(<Harness maxLength={40} />)

    expect(screen.getByText('0 / 40')).toBeInTheDocument()
    await user.type(control(), 'Soup')
    expect(screen.getByText('4 / 40')).toBeInTheDocument()
    expect(control()).toHaveAttribute('maxLength', '40')
  })

  it('renders a textarea when multiline', () => {
    render(<Harness multiline rows={3} />)

    expect(control().tagName).toBe('TEXTAREA')
    expect(control()).toHaveAttribute('rows', '3')
  })

  it('uses four rows by default when multiline', () => {
    render(<Harness multiline />)

    expect(control()).toHaveAttribute('rows', '4')
  })

  it('works without a label', () => {
    render(<Harness label={undefined} disabled className="mt-4" />)

    expect(document.querySelector('label')).toBeNull()
    expect(control()).toBeDisabled()
  })

  it('falls back to the first language when the chosen tab goes away', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<Harness initial={{ en: 'Soup', fr: 'Soupe', ar: 'شوربة' }} />)

    await user.click(tab('FR'))
    expect(control()).toHaveValue('Soupe')

    rerender(
      <Harness initial={{ en: 'Soup', fr: 'Soupe', ar: 'شوربة' }} languages={['ar', 'en']} />,
    )

    expect(control()).toHaveValue('شوربة')
  })

  it('falls back to English when no language is given', () => {
    render(<Harness languages={[]} initial={{ en: 'Soup' }} />)

    expect(control()).toHaveValue('Soup')
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
  })

  // Forms fill every language through toMenuTextForm(), so a missing key only
  // comes from a reset like these. The tab still has to flag English; what the
  // controlled input shows is react-hook-form's business, not this field's.
  it('flags English after a reset to a value without it', async () => {
    const user = userEvent.setup()
    render(<Harness required initial={{ en: 'Soup', fr: '' }} replaceWith={{ fr: 'Soupe' }} />)

    expect(tab('EN')).toHaveTextContent(/^EN$/)
    await user.click(screen.getByRole('button', { name: 'Replace' }))

    expect(tab('EN')).toHaveTextContent('EN•')
    expect(screen.getByTestId('value')).toHaveTextContent('{"fr":"Soupe"}')
  })

  it('copes with a reset that has no value for the field', async () => {
    const user = userEvent.setup()
    render(<Harness required initial={{ en: 'Soup', fr: '' }} replaceWith={undefined} />)

    await user.click(screen.getByRole('button', { name: 'Replace' }))

    expect(tab('EN')).toHaveTextContent('EN•')
    expect(screen.getByTestId('value')).toHaveTextContent('null')
  })
})
