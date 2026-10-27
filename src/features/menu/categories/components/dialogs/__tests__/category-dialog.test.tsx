import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { WritingHelpProvider } from '@/shared/components/forms/translatable/writing-help-provider'
import type { WritingHelpUses } from '@/shared/hooks/use-writing-help'
import { makeCategory, resetFactories } from '@/test/factories/menu'
import { makeSessionUser, makeWritingHelp } from '@/test/factories/session'
import { renderWithProviders } from '@/test/render-with-providers'
import { CategoryDialog } from '@/features/menu/categories/components/dialogs/category-dialog'

let mock: MockAdapter

const NOTE = 'Write in English or Arabic, one is enough. When you save, AI fills in the other.'

/** A new category on a menu in English and Arabic; `uses` null is no writing help. */
function open(uses: WritingHelpUses | null = makeWritingHelp({ limit: 30, left: 30 })) {
  const onClose = vi.fn()
  mock.onGet('/api/user').reply(200, { data: makeSessionUser() })
  mock.onPost('/api/categories').reply(201, { data: makeCategory({ id: 5 }) })
  renderWithProviders(
    <WritingHelpProvider uses={uses} onLeft={() => {}}>
      <CategoryDialog open category={null} onClose={onClose} />
    </WritingHelpProvider>,
  )
  return { onClose }
}

const posted = (url: string) =>
  JSON.parse(mock.history.post.find((call) => call.url === url)!.data as string) as Record<
    string,
    unknown
  >

const writingCalls = () => mock.history.post.filter((call) => call.url?.startsWith('/api/writing'))

describe('the category form fills in its other language with AI', () => {
  beforeEach(() => {
    resetFactories()
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

  it('says one language is enough, in place of the name hint', async () => {
    open()
    expect(await screen.findByText(NOTE)).toBeInTheDocument()
    expect(screen.queryByText(/the other one can be added later/)).not.toBeInTheDocument()
  })

  it('translates the name and description left in one language, then saves them', async () => {
    mock
      .onPost('/api/writing/translate-many')
      .reply(200, { data: { texts: ['شوربات', 'دافئة'], left: 29 } })
    const { onClose } = open()
    const user = userEvent.setup()
    await screen.findByText(NOTE)
    await user.type(screen.getByLabelText(/^Name/), 'Soups')
    await user.type(screen.getByLabelText(/^Description/), 'Warm')

    await user.click(screen.getByRole('button', { name: 'Add category' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(posted('/api/writing/translate-many')).toEqual({
      items: [
        { text: 'Soups', from: 'en', to: 'ar', max: 40 },
        { text: 'Warm', from: 'en', to: 'ar', max: 120 },
      ],
    })
    expect(posted('/api/categories')).toEqual({
      name: { en: 'Soups', ar: 'شوربات' },
      description: { en: 'Warm', ar: 'دافئة' },
      icon: null,
    })
  })

  it('shows the translations in the form when the save is refused', async () => {
    mock.onPost('/api/writing/translate-many').reply(200, { data: { texts: ['شوربات'], left: 29 } })
    mock.onGet('/api/user').reply(200, { data: makeSessionUser() })
    renderWithProviders(
      <WritingHelpProvider uses={makeWritingHelp({ limit: 30, left: 30 })} onLeft={() => {}}>
        <CategoryDialog open category={null} onClose={vi.fn()} />
      </WritingHelpProvider>,
    )
    mock.onPost('/api/categories').reply(422, {
      message: 'Taken.',
      errors: { 'name.en': ['That name is taken.'] },
    })
    const user = userEvent.setup()
    await screen.findByText(NOTE)
    await user.type(screen.getByLabelText(/^Name/), 'Soups')

    await user.click(screen.getByRole('button', { name: 'Add category' }))

    expect(await screen.findByText('That name is taken.')).toBeInTheDocument()
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getAllByRole('tab', { name: 'AR' })[0]!)
    expect(screen.getByLabelText(/^Name/)).toHaveValue('شوربات')
  })

  it('takes a name written only in the second language and fills the main one in', async () => {
    mock.onPost('/api/writing/translate-many').reply(200, { data: { texts: ['Soups'], left: 29 } })
    const { onClose } = open()
    const user = userEvent.setup()
    await screen.findByText(NOTE)
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getAllByRole('tab', { name: 'AR' })[0]!)
    await user.type(screen.getByLabelText(/^Name/), 'شوربات')

    await user.click(screen.getByRole('button', { name: 'Add category' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(posted('/api/writing/translate-many')).toEqual({
      items: [{ text: 'شوربات', from: 'ar', to: 'en', max: 40 }],
    })
    expect(posted('/api/categories')).toMatchObject({ name: { en: 'Soups', ar: 'شوربات' } })
  })

  it('still asks for the main language when the AI will not fill it in', async () => {
    const { onClose } = open(makeWritingHelp({ limit: 30, left: 0 }))
    const user = userEvent.setup()
    const dialog = screen.getByRole('dialog')
    await user.click((await within(dialog).findAllByRole('tab', { name: 'AR' }))[0]!)
    await user.type(screen.getByLabelText(/^Name/), 'شوربات')

    await user.click(screen.getByRole('button', { name: 'Add category' }))

    expect(await screen.findByText(/A category name is required in English/)).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
    expect(writingCalls()).toHaveLength(0)
  })

  it('saves as written, with no note and no AI, once the day is spent', async () => {
    const { onClose } = open(makeWritingHelp({ limit: 30, left: 0 }))
    const user = userEvent.setup()
    // Once the session has said the menu is in two languages.
    await screen.findAllByRole('tab', { name: 'AR' })
    await user.type(screen.getByLabelText(/^Name/), 'Soups')
    expect(screen.queryByText(NOTE)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Add category' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(writingCalls()).toHaveLength(0)
    expect(posted('/api/categories')).toMatchObject({ name: { en: 'Soups', ar: '' } })
  })
})
