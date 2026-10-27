import { screen, waitFor } from '@testing-library/react'
import { makeWritingHelp } from '@/test/factories/session'
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

/** Both buttons side by side, where a field places them apart. */
function Buttons(props: WritingHelpButtonsProps) {
  return (
    <WritingHelpButtons {...props}>
      {({ translate, write }) => (
        <>
          {write}
          {translate}
        </>
      )}
    </WritingHelpButtons>
  )
}

function deferred() {
  let resolve!: (value: [number, unknown]) => void
  const promise = new Promise<[number, unknown]>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

function show(
  props: Partial<WritingHelpButtonsProps> = {},
  uses: WritingHelpUses = makeWritingHelp(),
) {
  const onTranslated = vi.fn()
  const onWritten = vi.fn()
  renderWithProviders(
    <WritingHelpProvider uses={uses} onLeft={() => {}}>
      <Buttons
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

  it('is an icon to translate and a pill that says Improve with AI, with no count without a cap on credits', () => {
    show({ write: { kind: 'restaurant' } })

    expect(button(/^Translate to French$/)).toHaveTextContent(/^$/)
    expect(button(/^Improve with AI$/)).toHaveTextContent(/^Improve with AI$/)
    // The tooltip says what each does, and nothing more.
    expect(button(/^Improve with AI$/)).toHaveAttribute('title', 'Improve with AI')
    expect(button(/^Translate to French$/)).toHaveAttribute('title', 'Translate to French')
  })

  it('gives the reason a button is off before the count', () => {
    show({ text: '', peerText: '', write: { kind: 'category', subject: '' } }, makeWritingHelp())

    expect(button(/^Write with AI$/)).toHaveAttribute(
      'title',
      'Write with AI. Give the category a name first.',
    )
    expect(button(/^Translate from French$/)).toHaveAttribute(
      'title',
      'Translate from French. Write the text in either language first.',
    )
  })

  it('once the month’s credits are spent, when they come back is the only reason given', () => {
    show(
      { text: '', peerText: '', write: { kind: 'category', subject: '' } },
      makeWritingHelp({ limit: 500, left: 0 }),
    )

    expect(button(/^Write with AI$/)).toHaveAttribute(
      'title',
      "Write with AI. You've used this month's AI credits. They come back on Nov 1.",
    )
    expect(button(/^Translate from French$/)).toHaveAttribute(
      'title',
      "Translate from French. You've used this month's AI credits. They come back on Nov 1.",
    )
    for (const name of [/^Write with AI$/, /^Translate from French$/]) {
      expect(button(name)).toBeDisabled()
    }
  })

  it('says the month’s credits left in the tooltip, and no uses a day', () => {
    show({}, makeWritingHelp({ limit: 7500, left: 6840 }))

    expect(button(/^Translate to French$/)).toHaveAttribute(
      'title',
      'Translate to French. 6,840 of 7,500 AI credits left this month',
    )
  })

  it('locks only what the month’s credits no longer cover, and says when they are back', () => {
    // Two left: a translation (1) still goes, a description (3) does not.
    show({ write: { kind: 'restaurant' } }, makeWritingHelp({ limit: 500, left: 2 }))

    expect(button(/^Improve with AI$/)).toBeDisabled()
    expect(button(/^Improve with AI$/)).toHaveAttribute(
      'title',
      'Improve with AI. Not enough AI credits left this month for this. They come back on Nov 1.',
    )
    expect(button(/^Translate to French$/)).toBeEnabled()
  })

  it('has no Translate on a field with one language', () => {
    show({ peer: undefined, write: { kind: 'restaurant' } })

    expect(screen.queryByRole('button', { name: /translate/i })).not.toBeInTheDocument()
    expect(button(/^Improve with AI$/)).toBeInTheDocument()
  })
})
