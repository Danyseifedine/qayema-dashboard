import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { useForm, useWatch } from 'react-hook-form'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import {
  TranslatableTextField,
  type TranslatableFieldProps,
} from '@/shared/components/forms/translatable/translatable-text-field'
import { WritingHelpProvider } from '@/shared/components/forms/translatable/writing-help'
import { renderWithProviders } from '@/test/render-with-providers'

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
        maxLength={255}
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

describe('TranslatableTextField writing help', () => {
  let mock: MockAdapter

  beforeEach(() => {
    mock = new MockAdapter(api)
    resetCsrfToken(api)
    installCsrfInterceptor(api)
    mock.onGet('/api/csrf-token').reply(200, { token: 'csrf' })
  })

  afterEach(() => {
    mock.restore()
    api.interceptors.request.clear()
    resetCsrfToken(api)
  })

  const helped = (props: Parameters<typeof Harness>[0] = {}, on = true) =>
    renderWithProviders(
      <WritingHelpProvider on={on}>
        <Harness {...props} />
      </WritingHelpProvider>,
    )
  const button = (name: RegExp) => screen.getByRole('button', { name })
  const sent = (index = 0) => JSON.parse(mock.history.post[index]?.data as string) as unknown
  const value = () => JSON.parse(screen.getByTestId('value').textContent ?? '') as unknown

  it('shows nothing while the writing help is off, or with nothing to do', () => {
    const { unmount } = helped(
      { initial: { en: 'Soup', fr: '' }, write: { kind: 'category', name: { en: 'Soups' } } },
      false,
    )
    expect(screen.queryByRole('button', { name: /translate|with ai/i })).not.toBeInTheDocument()
    unmount()

    helped({ languages: ['en'], initial: { en: 'Soup' } })
    expect(screen.queryByRole('button', { name: /translate|with ai/i })).not.toBeInTheDocument()
  })

  it('translates the open tab into the other language and opens it', async () => {
    const user = userEvent.setup()
    mock.onPost('/api/writing/translate').reply(200, { data: { text: 'Soupe du jour' } })
    helped({ initial: { en: 'Soup of the day', fr: 'old' } })

    await user.click(button(/^Translate to French$/))

    await waitFor(() => expect(control()).toHaveValue('Soupe du jour'))
    expect(tab('FR')).toHaveAttribute('aria-selected', 'true')
    expect(sent()).toEqual({ text: 'Soup of the day', from: 'en', to: 'fr' })
    expect(value()).toEqual({ en: 'Soup of the day', fr: 'Soupe du jour' })
    // The French tab has text now, so from here it goes the other way.
    expect(button(/^Translate to English$/)).toBeEnabled()
  })

  it('translates the second language into the main one', async () => {
    const user = userEvent.setup()
    mock
      .onPost('/api/writing/translate')
      .replyOnce(200, { data: { text: 'Lentil soup' } })
      .onPost('/api/writing/translate')
      .replyOnce(200, { data: { text: 'Lentil soup, warm' } })
    helped({ initial: { en: '', fr: 'Soupe de lentilles' } })

    // An empty open tab is filled from the other language.
    await user.click(button(/^Translate from French$/))

    await waitFor(() => expect(control()).toHaveValue('Lentil soup'))
    expect(tab('EN')).toHaveAttribute('aria-selected', 'true')
    expect(sent()).toEqual({ text: 'Soupe de lentilles', from: 'fr', to: 'en' })

    // From the French tab, its text goes into English.
    await user.click(tab('FR'))
    await user.click(button(/^Translate to English$/))

    await waitFor(() => expect(control()).toHaveValue('Lentil soup, warm'))
    expect(tab('EN')).toHaveAttribute('aria-selected', 'true')
    expect(sent(1)).toEqual({ text: 'Soupe de lentilles', from: 'fr', to: 'en' })
    expect(value()).toEqual({ en: 'Lentil soup, warm', fr: 'Soupe de lentilles' })
  })

  it('has nothing to translate until either language has text', async () => {
    const user = userEvent.setup()
    helped({ initial: { en: '  ', fr: '' } })

    expect(button(/^Translate from French$/)).toBeDisabled()
    expect(button(/^Translate from French$/)).toHaveAttribute(
      'title',
      'Write the text in either language first.',
    )

    await user.type(control(), 'Soup')
    expect(button(/^Translate to French$/)).toBeEnabled()
    expect(button(/^Translate to French$/)).not.toHaveAttribute('title')
  })

  it('writes a description from the name, then offers to improve it', async () => {
    const user = userEvent.setup()
    mock
      .onPost('/api/writing/category-description')
      .replyOnce(200, { data: { text: 'Warm bowls to start.' } })
      .onPost('/api/writing/category-description')
      .replyOnce(200, { data: { text: 'Warm bowls, made fresh, to start.' } })
    helped({
      initial: { en: '', fr: '' },
      write: { kind: 'category', name: { en: 'Soups', fr: '' } },
    })

    await user.click(button(/^Write with AI$/))
    await waitFor(() => expect(control()).toHaveValue('Warm bowls to start.'))
    expect(sent()).toEqual({ name: 'Soups', text: '', language: 'en' })

    await user.click(button(/^Improve with AI$/))
    await waitFor(() => expect(control()).toHaveValue('Warm bowls, made fresh, to start.'))
    expect(sent(1)).toEqual({ name: 'Soups', text: 'Warm bowls to start.', language: 'en' })
  })

  it('writes in the open language, from the main name when it has none there', async () => {
    const user = userEvent.setup()
    mock.onPost('/api/writing/category-description').reply(200, { data: { text: 'Des soupes.' } })
    helped({
      initial: { en: '', fr: '' },
      write: { kind: 'category', name: { en: 'Soups', fr: undefined } },
    })

    await user.click(tab('FR'))
    await user.click(button(/^Write with AI$/))

    await waitFor(() => expect(value()).toEqual({ en: '', fr: 'Des soupes.' }))
    expect(sent()).toEqual({ name: 'Soups', text: '', language: 'fr' })
  })

  it('writes the restaurant’s description, which the server bases on its menu', async () => {
    const user = userEvent.setup()
    mock
      .onPost('/api/writing/restaurant-description')
      .reply(200, { data: { text: 'Pizzas and salads for every appetite.' } })
    helped({ languages: ['en'], initial: { en: '' }, write: { kind: 'restaurant' } })

    await user.click(button(/^Write with AI$/))

    await waitFor(() => expect(control()).toHaveValue('Pizzas and salads for every appetite.'))
    expect(sent()).toEqual({ text: '', language: 'en' })
    expect(button(/^Improve with AI$/)).not.toHaveAttribute('title')
  })

  it('needs a name before it can write', () => {
    helped({
      languages: ['en'],
      initial: { en: '' },
      write: { kind: 'category', name: { en: ' ' } },
    })

    expect(button(/^Write with AI$/)).toBeDisabled()
    expect(button(/^Write with AI$/)).toHaveAttribute('title', 'Give the category a name first.')
  })

  it('says why when it fails, and when the day’s uses are spent', async () => {
    const user = userEvent.setup()
    mock
      .onPost('/api/writing/translate')
      .replyOnce(503, { message: 'Try again in a moment.', code: 'writing_help_failed' })
      .onPost('/api/writing/category-description')
      .replyOnce(429, {
        message: 'You have used today’s writing help.',
        code: 'writing_help_limit',
        retry_after: 80000,
      })
    helped({ initial: { en: 'Soup', fr: '' }, write: { kind: 'category', name: { en: 'Soups' } } })

    await user.click(button(/^Translate to French$/))
    expect(await screen.findByText('Could not translate')).toBeInTheDocument()
    expect(screen.getByText('Try again in a moment.')).toBeInTheDocument()
    expect(control()).toHaveValue('Soup')

    await user.click(button(/^Improve with AI$/))
    expect(await screen.findByText('You have used today’s writing help.')).toBeInTheDocument()
    expect(screen.queryByText(/80000/)).not.toBeInTheDocument()
    expect(control()).toHaveValue('Soup')
  })
})
