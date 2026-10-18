import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import {
  WritingHelpButtons,
  type WritingHelpButtonsProps,
} from '@/shared/components/forms/translatable/writing-help-buttons'
import { WritingHelpProvider } from '@/shared/components/forms/translatable/writing-help-provider'
import type { WritingHelpUses } from '@/shared/hooks/use-writing-help'
import { renderWithProviders } from '@/test/render-with-providers'

let mock: MockAdapter

function deferred() {
  let resolve!: (value: [number, unknown]) => void
  const promise = new Promise<[number, unknown]>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

function show(
  props: Partial<WritingHelpButtonsProps> = {},
  uses: WritingHelpUses = { limit: null, left: null },
) {
  const onTranslated = vi.fn()
  const onWritten = vi.fn()
  renderWithProviders(
    <WritingHelpProvider uses={uses} onLeft={() => {}}>
      <WritingHelpButtons
        active="en"
        text="Soup"
        peer="fr"
        peerText=""
        write={null}
        maxLength={255}
        onTranslated={onTranslated}
        onWritten={onWritten}
        {...props}
      />
    </WritingHelpProvider>,
  )
  return { onTranslated, onWritten }
}

const button = (name: RegExp) => screen.getByRole('button', { name })
const sent = () => JSON.parse(mock.history.post[0]?.data as string) as unknown

describe('WritingHelpButtons', () => {
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

  it('runs one at a time: while one works, both wait and the pressed one spins', async () => {
    const user = userEvent.setup()
    const answer = deferred()
    mock.onPost('/api/writing/translate').reply(() => answer.promise)
    show({ write: { kind: 'restaurant' } })

    await user.click(button(/^Translate to French$/))

    await waitFor(() =>
      expect(button(/^Translate to French$/)).toHaveAttribute('aria-busy', 'true'),
    )
    expect(button(/^Improve with AI$/)).toBeDisabled()
    expect(button(/^Improve with AI$/)).not.toHaveAttribute('aria-busy')

    answer.resolve([200, { data: { text: 'Soupe', left: null } }])
    await waitFor(() => expect(button(/^Improve with AI$/)).toBeEnabled())
    expect(button(/^Translate to French$/)).not.toHaveAttribute('aria-busy')
  })

  it('translates the open tab into the other language, and says so with what came back', async () => {
    const user = userEvent.setup()
    mock.onPost('/api/writing/translate').reply(200, { data: { text: 'Soupe', left: null } })
    const { onTranslated } = show()

    await user.click(button(/^Translate to French$/))

    await waitFor(() => expect(onTranslated).toHaveBeenCalledWith('fr', 'Soupe'))
    // The field's limit rides along; a field that is no description has no fit.
    expect(sent()).toEqual({ text: 'Soup', from: 'en', to: 'fr', max: 255 })
  })

  it('tells a description’s translation which description it is', async () => {
    const user = userEvent.setup()
    mock.onPost('/api/writing/translate').reply(200, { data: { text: 'Soupe', left: null } })
    show({ write: { kind: 'category', subject: 'Soups' }, maxLength: 300 })

    await user.click(button(/^Translate to French$/))

    await waitFor(() => expect(mock.history.post).toHaveLength(1))
    expect(sent()).toEqual({ text: 'Soup', from: 'en', to: 'fr', max: 300, fit: 'category' })
  })

  it('fills an empty open tab from the other language', async () => {
    const user = userEvent.setup()
    mock.onPost('/api/writing/translate').reply(200, { data: { text: 'Soup', left: null } })
    const { onTranslated } = show({ text: '', peerText: 'Soupe' })

    await user.click(button(/^Translate from French$/))

    await waitFor(() => expect(onTranslated).toHaveBeenCalledWith('en', 'Soup'))
    expect(sent()).toEqual({ text: 'Soupe', from: 'fr', to: 'en', max: 255 })
  })

  it('hands back what was written for the open language', async () => {
    const user = userEvent.setup()
    mock
      .onPost('/api/writing/category-description')
      .reply(200, { data: { text: 'Warm bowls.', left: null } })
    const { onWritten } = show({
      active: 'fr',
      text: '',
      write: { kind: 'category', subject: 'Soups' },
    })

    await user.click(button(/^Write with AI$/))

    await waitFor(() => expect(onWritten).toHaveBeenCalledWith('Warm bowls.'))
    expect(sent()).toEqual({ name: 'Soups', text: '', language: 'fr' })
  })

  it('shows no count and no reason on a package with no daily cap', () => {
    show({ write: { kind: 'restaurant' } })

    expect(screen.queryByText(/\d+\/\d+/)).not.toBeInTheDocument()
    expect(button(/^Improve with AI$/)).not.toHaveAttribute('title')
    expect(button(/^Translate to French$/)).not.toHaveAttribute('title')
  })

  it('gives the reason a button is off before the count', () => {
    show(
      { text: '', peerText: '', write: { kind: 'category', subject: '' } },
      { limit: 30, left: 12 },
    )

    expect(button(/^Write with AI$/)).toHaveAttribute('title', 'Give the category a name first.')
    expect(button(/^Translate from French$/)).toHaveAttribute(
      'title',
      'Write the text in either language first.',
    )
    expect(screen.getAllByText('18/30')).toHaveLength(2)
  })

  it('once spent, coming back tomorrow is the only reason given', () => {
    show(
      { text: '', peerText: '', write: { kind: 'category', subject: '' } },
      { limit: 30, left: 0 },
    )

    for (const name of [/^Write with AI$/, /^Translate from French$/]) {
      expect(button(name)).toBeDisabled()
      expect(button(name)).toHaveAttribute('title', 'Come back tomorrow for more AI help.')
    }
    expect(screen.getAllByText('30/30')).toHaveLength(2)
  })

  it('has no Translate on a field with one language', () => {
    show({ peer: undefined, write: { kind: 'restaurant' } })

    expect(screen.queryByRole('button', { name: /translate/i })).not.toBeInTheDocument()
    expect(button(/^Improve with AI$/)).toBeInTheDocument()
  })
})
