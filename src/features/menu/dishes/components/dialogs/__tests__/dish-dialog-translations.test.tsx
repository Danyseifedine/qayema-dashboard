import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { WritingHelpProvider } from '@/shared/components/forms/translatable/writing-help-provider'
import type { WritingHelpUses } from '@/shared/hooks/use-writing-help'
import { makeCategory, makeDish, resetFactories } from '@/test/factories/menu'
import { makeSessionUser, makeWritingHelp } from '@/test/factories/session'
import { renderWithProviders } from '@/test/render-with-providers'
import { DishDialog } from '@/features/menu/dishes/components/dialogs/dish-dialog'

let mock: MockAdapter

const CATEGORIES = [makeCategory({ id: 1, name: { en: 'Grills', ar: null } })]

/** A new dish on a menu in English and Arabic; `uses` null is no writing help. */
function open(uses: WritingHelpUses | null = makeWritingHelp({ limit: 30, left: 30 })) {
  const onClose = vi.fn()
  mock.onGet('/api/user').reply(200, { data: makeSessionUser() })
  mock.onPost('/api/dishes').reply(201, { data: makeDish({ id: 99 }) })
  renderWithProviders(
    <WritingHelpProvider uses={uses} onLeft={() => {}}>
      <DishDialog
        open
        dish={null}
        dishes={[]}
        categories={CATEGORIES}
        defaultCategoryId={null}
        currency="USD"
        secondCurrency={null}
        locale="en"
        onClose={onClose}
        onOpenCategories={vi.fn()}
        onOpenBuilds={vi.fn()}
        onOpenOffers={vi.fn()}
      />
    </WritingHelpProvider>,
  )
  return { onClose }
}

async function section() {
  return screen.findByRole('region', { name: 'Variants and add-ons' })
}

/** A dish named in English, with ingredients and one add-on. */
async function fillDish() {
  const user = userEvent.setup()
  const region = await section()
  await user.type(screen.getByLabelText(/^Name/), 'Kebab')
  await user.type(screen.getByLabelText(/^Ingredients/), 'lamb, onion')
  await user.type(screen.getByLabelText('Price'), '9')
  await user.click(within(region).getByRole('button', { name: 'Add add-on' }))
  await user.type(within(region).getByLabelText('Add-on 1'), 'Extra bread')
  return { user, region }
}

const posted = (url: string) =>
  JSON.parse(mock.history.post.find((call) => call.url === url)!.data as string) as Record<
    string,
    unknown
  >

describe('the dish form fills in its other language with AI', () => {
  beforeEach(() => {
    resetFactories()
    mock = new MockAdapter(api)
    resetCsrfToken(api)
    installCsrfInterceptor(api)
    mock.onGet('/api/csrf-token').reply(200, { token: 'csrf' })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    mock.restore()
    api.interceptors.request.clear()
    api.interceptors.response.clear()
    resetCsrfToken(api)
  })

  it('says one language is enough, only while saving will translate', async () => {
    const note = 'Write in English or Arabic, one is enough. When you save, AI fills in the other.'
    open()
    expect(await screen.findByText(note)).toBeInTheDocument()
  })

  it('says nothing of it once the day is spent', async () => {
    open(makeWritingHelp({ limit: 30, left: 0 }))
    await section()
    expect(screen.queryByText(/one is enough/)).not.toBeInTheDocument()
  })

  it('translates everything left in one language in one go, then saves it', async () => {
    mock.onPost('/api/writing/translate-many').reply(200, {
      data: { texts: ['كباب', 'لحم, بصل', 'خبز إضافي'], left: 29 },
    })
    const { onClose } = open()
    const { user } = await fillDish()

    await user.click(screen.getByRole('button', { name: 'Add dish' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(posted('/api/writing/translate-many')).toEqual({
      items: [
        { text: 'Kebab', from: 'en', to: 'ar', max: 60 },
        { text: 'lamb, onion', from: 'en', to: 'ar', max: 300 },
        { text: 'Extra bread', from: 'en', to: 'ar', max: 40 },
      ],
    })
    expect(posted('/api/dishes')).toMatchObject({
      name: { en: 'Kebab', ar: 'كباب' },
      // Tidied into the Arabic list, as the box does.
      ingredients: { en: 'lamb, onion', ar: 'لحم، بصل' },
      addons: [{ name: { en: 'Extra bread', ar: 'خبز إضافي' }, price: 0 }],
    })
  })

  it('saves as written when the translation fails, and says so', async () => {
    mock
      .onPost('/api/writing/translate-many')
      .reply(503, { message: 'Try again in a moment.', code: 'writing_help_failed' })
    const { onClose } = open()
    const { user } = await fillDish()

    await user.click(screen.getByRole('button', { name: 'Add dish' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(await screen.findByText('Could not translate')).toBeInTheDocument()
    expect(posted('/api/dishes')).toMatchObject({ name: { en: 'Kebab', ar: '' } })
  })

  it('asks nothing when the day is spent', async () => {
    const { onClose } = open(makeWritingHelp({ limit: 30, left: 0 }))
    const { user } = await fillDish()
    await user.click(screen.getByRole('button', { name: 'Add dish' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(mock.history.post.filter((call) => call.url?.startsWith('/api/writing'))).toHaveLength(0)
  })

  it('asks nothing when the month’s credits are spent', async () => {
    const { onClose } = open(makeWritingHelp({ limit: 30, left: 30 }, { limit: 500, left: 0 }))
    const { user } = await fillDish()
    await user.click(screen.getByRole('button', { name: 'Add dish' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(mock.history.post.filter((call) => call.url?.startsWith('/api/writing'))).toHaveLength(0)
  })

  it('asks nothing without the writing help', async () => {
    const { onClose } = open(null)
    const { user } = await fillDish()
    await user.click(screen.getByRole('button', { name: 'Add dish' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(mock.history.post.filter((call) => call.url?.startsWith('/api/writing'))).toHaveLength(0)
  })

  it('asks nothing once every text is in both languages', async () => {
    const user = userEvent.setup()
    const { onClose } = open()
    await section()
    await user.type(screen.getByLabelText(/^Name/), 'Kebab')
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getAllByRole('tab', { name: 'AR' })[0]!)
    await user.type(screen.getByLabelText(/^Name/), 'كباب')

    await user.click(screen.getByRole('button', { name: 'Add dish' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(mock.history.post.filter((call) => call.url?.startsWith('/api/writing'))).toHaveLength(0)
  })
})

describe('one button translates every variant and add-on name', () => {
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

  it('fills the names into the other language and opens it', async () => {
    mock
      .onPost('/api/writing/translate-many')
      .reply(200, { data: { texts: ['خبز إضافي'], left: 29 } })
    open()
    const { user, region } = await fillDish()
    const button = within(region).getByRole('button', { name: 'Translate all names' })
    expect(button).toHaveAttribute(
      'title',
      "Translate all names. You've used 0 of 30 AI uses today",
    )

    await user.click(button)

    await waitFor(() => expect(within(region).getByLabelText('Add-on 1')).toHaveValue('خبز إضافي'))
    // Only the choices: the dish's own name waits for the save.
    expect(posted('/api/writing/translate-many')).toEqual({
      items: [{ text: 'Extra bread', from: 'en', to: 'ar', max: 40 }],
    })
    expect(within(region).getByRole('tab', { name: 'AR' })).toHaveAttribute('aria-selected', 'true')
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('title', 'Translate all names. Every name is in both languages.')
  })

  it('holds the save while the names are being translated: one AI request at a time', async () => {
    // Never answers, so the translation stays on its way.
    mock.onPost('/api/writing/translate-many').reply(() => new Promise(() => {}))
    open()
    const { user, region } = await fillDish()

    await user.click(within(region).getByRole('button', { name: 'Translate all names' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Add dish' })).toBeDisabled())
  })

  it('is red and locked once the day is spent', async () => {
    open(makeWritingHelp({ limit: 30, left: 0 }))
    const region = await section()
    const button = within(region).getByRole('button', { name: 'Translate all names' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute(
      'title',
      'Translate all names. Come back tomorrow for more AI help.',
    )
  })

  it('is not there without the writing help', async () => {
    open(null)
    const region = await section()
    expect(within(region).queryByRole('button', { name: 'Translate all names' })).toBeNull()
  })
})
