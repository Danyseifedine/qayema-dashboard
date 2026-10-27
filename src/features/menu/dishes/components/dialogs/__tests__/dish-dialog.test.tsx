import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AxiosProgressEvent } from 'axios'
import MockAdapter from 'axios-mock-adapter'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { makeCategory, makeDish, resetFactories } from '@/test/factories/menu'
import { renderWithProviders } from '@/test/render-with-providers'
import type { Category } from '@/features/menu/categories/schemas/category.schema'
import { DishDialog } from '@/features/menu/dishes/components/dialogs/dish-dialog'

let mock: MockAdapter

const UPLOAD_KEY = '11111111-2222-4333-8444-555555555555'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

function jpeg(name = 'shank.jpg'): File {
  return new File([new Uint8Array(64)], name, { type: 'image/jpeg' })
}

const CATEGORIES = [
  makeCategory({ id: 1, name: { en: 'Starters', ar: null } }),
  makeCategory({ id: 2, name: { en: 'Mains', ar: null } }),
]

function Harness({
  categories = CATEGORIES,
  dish = null,
  secondCurrency = null,
  onOpenCategories = vi.fn(),
  onClose = vi.fn(),
}: {
  categories?: Category[]
  dish?: ReturnType<typeof makeDish> | null
  secondCurrency?: string | null
  onOpenCategories?: () => void
  onClose?: () => void
}) {
  // A counter whose only job is to force a parent re-render, which is what
  // used to hand the dialog a fresh `categories` array identity.
  const [, setTick] = useState(0)

  return (
    <>
      <button type="button" onClick={() => setTick((n) => n + 1)}>
        rerender
      </button>
      <DishDialog
        open
        dish={dish}
        dishes={[]}
        categories={[...categories]}
        defaultCategoryId={null}
        currency="USD"
        secondCurrency={secondCurrency}
        locale="en"
        onClose={onClose}
        onOpenCategories={onOpenCategories}
        onOpenBuilds={vi.fn()}
        onOpenOffers={vi.fn()}
      />
    </>
  )
}

describe('DishDialog', () => {
  beforeEach(() => {
    resetFactories()
    mock = new MockAdapter(api)
    resetCsrfToken(api)
    installCsrfInterceptor(api)
    mock.onGet('/api/csrf-token').reply(200, { token: 'csrf' })
    // jsdom cannot decode an image; the guard then leaves the pixel check to
    // the server, which is what it does in a browser that cannot either.
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('no decoder')))
    // Vitest's jsdom object URLs only take jsdom's own Blob; the preview URL
    // itself is not under test.
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    mock.restore()
    api.interceptors.request.clear()
    api.interceptors.response.clear()
    resetCsrfToken(api)
  })

  it('explains the disabled save when there are no categories', async () => {
    const onOpenCategories = vi.fn()
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(
      <Harness categories={[]} onOpenCategories={onOpenCategories} onClose={onClose} />,
    )

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Add a category first')).toBeInTheDocument()

    const submit = within(dialog).getByRole('button', { name: 'Add dish' })
    expect(submit).toBeDisabled()
    // The tooltip is only reachable because the disabled button still
    // receives pointer events.
    expect(submit).toHaveAttribute('title', 'Add a category first')

    await user.click(within(dialog).getByRole('button', { name: 'Go to categories' }))
    expect(onClose).toHaveBeenCalled()
    expect(onOpenCategories).toHaveBeenCalled()
  })

  it('keeps what the owner typed when the parent re-renders', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Harness />)

    const name = screen.getByLabelText(/^Name/)
    await user.type(name, 'Hummus')
    expect(name).toHaveValue('Hummus')

    // Previously this re-ran the reset effect and wiped the field.
    await user.click(screen.getByRole('button', { name: 'rerender' }))

    await waitFor(() => expect(screen.getByLabelText(/^Name/)).toHaveValue('Hummus'))
  })

  it('preselects the first category rather than an invalid placeholder', () => {
    renderWithProviders(<Harness />)

    // It used to default to the literal id 0, which matched no option and
    // left the control looking empty.
    expect(screen.getByRole('combobox', { name: /Category/ })).toHaveValue('Starters')
  })

  it('preselects the first category once they arrive after the dialog opened', async () => {
    const user = userEvent.setup()
    const { rerender } = renderWithProviders(
      <DishDialog
        open
        dish={null}
        dishes={[]}
        categories={[]}
        defaultCategoryId={null}
        currency="USD"
        secondCurrency={null}
        locale="en"
        onClose={vi.fn()}
        onOpenCategories={vi.fn()}
        onOpenBuilds={vi.fn()}
        onOpenOffers={vi.fn()}
      />,
    )
    await user.type(screen.getByLabelText(/^Name/), 'Hummus')

    rerender(
      <DishDialog
        open
        dish={null}
        dishes={[]}
        categories={CATEGORIES}
        defaultCategoryId={null}
        currency="USD"
        secondCurrency={null}
        locale="en"
        onClose={vi.fn()}
        onOpenCategories={vi.fn()}
        onOpenBuilds={vi.fn()}
        onOpenOffers={vi.fn()}
      />,
    )

    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: /Category/ })).toHaveValue('Starters'),
    )
    expect(screen.getByLabelText(/^Name/)).toHaveValue('Hummus')
  })

  it('tidies the ingredients into a clean list as the owner leaves the box', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Harness />)

    const box = within(screen.getByRole('dialog')).getByLabelText(/^Ingredients/)
    await user.type(box, 'onion,..tomato...ect')
    expect(box).toHaveValue('onion,..tomato...ect')
    await user.tab()

    expect(box).toHaveValue('onion, tomato')
  })

  it('posts the category as a number, not a string', async () => {
    mock.onPost('/api/dishes').reply(201, { data: makeDish({ id: 7, category_id: 2 }) })

    const user = userEvent.setup()
    renderWithProviders(<Harness />)

    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText(/^Name/), 'Lamb')
    await user.click(within(dialog).getByRole('combobox', { name: /Category/ }))
    await user.click(await screen.findByRole('option', { name: 'Mains' }))
    await user.click(within(dialog).getByRole('button', { name: 'Add dish' }))

    await waitFor(() => {
      const post = mock.history.post.find((r) => r.url === '/api/dishes')
      expect(post).toBeDefined()
      expect(JSON.parse(post!.data as string).category_id).toBe(2)
    })
  })

  it('removing a saved photo hides it and deletes it on save', async () => {
    const dish = makeDish({ id: 7, category_id: 2, image_url: 'https://cdn.qayema.test/dish.webp' })
    mock.onPatch('/api/dishes/7').reply(200, { data: { ...dish, image_url: null } })

    const user = userEvent.setup()
    renderWithProviders(<Harness dish={dish} />)

    const dialog = screen.getByRole('dialog')
    // The preview is decorative (alt=""), so it is found by its source.
    const photo = () => dialog.querySelector('img[src="https://cdn.qayema.test/dish.webp"]')
    expect(photo()).not.toBeNull()

    await user.click(within(dialog).getByRole('button', { name: 'Remove' }))

    // The saved photo is gone from the field at once, the drop area is back.
    expect(photo()).toBeNull()
    expect(within(dialog).queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Save dish' }))

    await waitFor(() => {
      const patch = mock.history.patch.find((r) => r.url === '/api/dishes/7')
      expect(patch).toBeDefined()
      const body = JSON.parse(patch!.data as string)
      expect(body.delete_image).toBe(true)
      expect(body.image_key).toBeUndefined()
    })
  })
  it('uploads a photo, shows its progress, and sends only its key on save', async () => {
    const upload = deferred<[number, unknown]>()
    mock.onPost('/api/uploads/temp').reply((config) => {
      config.onUploadProgress?.({ loaded: 40, total: 100 } as AxiosProgressEvent)
      return upload.promise
    })
    mock.onPost('/api/dishes').reply(201, { data: makeDish({ id: 7 }) })
    const onClose = vi.fn()

    const user = userEvent.setup()
    renderWithProviders(<Harness onClose={onClose} />)

    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText(/^Name/), 'Lamb shank')
    await user.upload(dialog.querySelector<HTMLInputElement>('input[type="file"]')!, jpeg())

    // Bytes in flight: the drop area turns into a progress bar.
    const bar = await within(dialog).findByRole('progressbar', { name: 'Upload progress' })
    await waitFor(() => expect(bar).toHaveAttribute('aria-valuenow', '40'))
    expect(within(dialog).getByText('Uploading…')).toBeInTheDocument()

    const sent = mock.history.post.find((r) => r.url === '/api/uploads/temp')!
    expect((sent.data as FormData).get('context')).toBe('dish')

    upload.resolve([200, { key: UPLOAD_KEY, optimized_size: '98.4 KB', saved_percent: 95 }])

    expect(await within(dialog).findByText('shank.jpg')).toBeInTheDocument()
    expect(within(dialog).getByText('98.4 KB')).toBeInTheDocument()
    expect(within(dialog).getByText('95% smaller')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Add dish' }))

    await waitFor(() => {
      const post = mock.history.post.find((r) => r.url === '/api/dishes')
      expect(post).toBeDefined()
      const body = JSON.parse(post!.data as string)
      expect(body.image_key).toBe(UPLOAD_KEY)
      expect(body.delete_image).toBeUndefined()
      // The preview and file name stay in the browser.
      expect(body.image).toBeUndefined()
    })
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
  })

  it('removing a fresh upload sends no image at all', async () => {
    mock.onPost('/api/uploads/temp').reply(200, {
      key: UPLOAD_KEY,
      optimized_size: '98.4 KB',
      saved_percent: 0,
    })
    mock.onPost('/api/dishes').reply(201, { data: makeDish({ id: 7 }) })

    const user = userEvent.setup()
    renderWithProviders(<Harness />)

    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText(/^Name/), 'Lamb shank')
    await user.upload(dialog.querySelector<HTMLInputElement>('input[type="file"]')!, jpeg())
    await within(dialog).findByText('shank.jpg')
    // Nothing was saved by the optimizer, so no "smaller" chip.
    expect(within(dialog).queryByText(/smaller/)).not.toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Remove' }))
    expect(within(dialog).queryByText('shank.jpg')).not.toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Add dish' }))

    await waitFor(() => {
      const post = mock.history.post.find((r) => r.url === '/api/dishes')
      expect(post).toBeDefined()
      const body = JSON.parse(post!.data as string)
      expect(body).not.toHaveProperty('image_key')
      expect(body).not.toHaveProperty('delete_image')
    })
  })

  it('shows a failed upload in the field and keeps the dialog usable', async () => {
    mock.onPost('/api/uploads/temp').reply(500, { message: 'Server error', code: 'server_error' })

    const user = userEvent.setup()
    renderWithProviders(<Harness />)

    const dialog = screen.getByRole('dialog')
    await user.upload(dialog.querySelector<HTMLInputElement>('input[type="file"]')!, jpeg())

    expect(await within(dialog).findByText('Server error')).toBeInTheDocument()
    expect(
      within(dialog).queryByText('We trim it to fit the dish card and make it quick to load.'),
    ).toBeNull()
  })

  it('fills the form from the dish being edited', async () => {
    const dish = makeDish({
      id: 8,
      name: { en: 'Soup of the day', ar: null },
      ingredients: { en: 'Ask the waiter', ar: null },
      price: null,
      category_id: 2,
      is_available: false,
    })
    mock.onPatch('/api/dishes/8').reply(200, { data: dish })

    const user = userEvent.setup()
    renderWithProviders(<Harness dish={dish} />)

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Edit dish' })).toBeInTheDocument()
    await waitFor(() =>
      expect(within(dialog).getByLabelText(/^Name/)).toHaveValue('Soup of the day'),
    )
    expect(within(dialog).getByLabelText(/^Ingredients/)).toHaveValue('Ask the waiter')
    expect(within(dialog).getByRole('combobox', { name: /Category/ })).toHaveValue('Mains')
    expect(within(dialog).getByRole('switch')).not.toBeChecked()

    await user.click(within(dialog).getByRole('button', { name: 'Save dish' }))

    await waitFor(() => {
      const patch = mock.history.patch.find((r) => r.url === '/api/dishes/8')
      expect(patch).toBeDefined()
      const body = JSON.parse(patch!.data as string)
      // A dish with no price keeps no price.
      expect(body.price).toBeNull()
      expect(body.is_available).toBe(false)
      expect(body.category_id).toBe(2)
    })
  })

  it('leaves a dish’s saved builds alone while builds are off for the restaurant', async () => {
    const dish = makeDish({
      id: 8,
      builds: [
        {
          id: 3,
          name: { en: 'Half & half' },
          shape: 'split',
          parts: [2],
          category_id: 1,
          dish_ids: null,
          choices: [],
        },
      ],
    })
    mock.onPatch('/api/dishes/8').reply(200, { data: dish })
    const user = userEvent.setup()
    renderWithProviders(<Harness dish={dish} />)

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).queryByRole('region', { name: 'Build your own' })).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Save dish' }))

    await waitFor(() => expect(mock.history.patch).toHaveLength(1))
    expect(JSON.parse(mock.history.patch[0]!.data as string)).not.toHaveProperty('builds')
  })

  it('has no currency to choose, and sends none, without a second currency', async () => {
    mock.onPost('/api/dishes').reply(201, { data: makeDish({ id: 7 }) })
    const user = userEvent.setup()
    renderWithProviders(<Harness />)

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).queryByRole('tablist', { name: 'Dish currency' })).not.toBeInTheDocument()
    await user.type(within(dialog).getByLabelText(/^Name/), 'Lamb')
    await user.click(within(dialog).getByRole('button', { name: 'Add dish' }))

    await waitFor(() => expect(mock.history.post).toHaveLength(1))
    expect(JSON.parse(mock.history.post[0]!.data as string)).not.toHaveProperty('currency')
  })

  it('prices a new dish in the main currency, or the second one when picked', async () => {
    mock.onPost('/api/dishes').reply(201, { data: makeDish({ id: 7 }) })
    const user = userEvent.setup()
    renderWithProviders(<Harness secondCurrency="LBP" />)

    const dialog = screen.getByRole('dialog')
    const currencies = within(dialog).getByRole('tablist', { name: 'Dish currency' })
    expect(within(currencies).getByRole('tab', { name: 'USD' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    // The switch sits inside the price field, in place of the code before the number.
    expect(within(dialog).getByLabelText(/^Price/).parentElement).toContainElement(currencies)

    await user.click(within(currencies).getByRole('tab', { name: 'LBP' }))
    expect(within(currencies).getByRole('tab', { name: 'LBP' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await user.type(within(dialog).getByLabelText(/^Name/), 'Lamb')
    await user.click(within(dialog).getByRole('button', { name: 'Add dish' }))

    await waitFor(() => expect(mock.history.post).toHaveLength(1))
    expect(JSON.parse(mock.history.post[0]!.data as string).currency).toBe('LBP')
  })

  it('opens a dish on its own currency and keeps it on save', async () => {
    const dish = makeDish({ id: 8, currency: 'LBP' })
    mock.onPatch('/api/dishes/8').reply(200, { data: dish })
    const user = userEvent.setup()
    renderWithProviders(<Harness dish={dish} secondCurrency="LBP" />)

    const dialog = screen.getByRole('dialog')
    const currencies = within(dialog).getByRole('tablist', { name: 'Dish currency' })
    await waitFor(() =>
      expect(within(currencies).getByRole('tab', { name: 'LBP' })).toHaveAttribute(
        'aria-selected',
        'true',
      ),
    )
    await user.click(within(dialog).getByRole('button', { name: 'Save dish' }))

    await waitFor(() => expect(mock.history.patch).toHaveLength(1))
    expect(JSON.parse(mock.history.patch[0]!.data as string).currency).toBe('LBP')
  })

  it('names a category that has no text in this language', () => {
    renderWithProviders(
      <Harness categories={[makeCategory({ id: 4, name: { en: null, ar: null } })]} />,
    )

    expect(screen.getByRole('combobox', { name: /Category/ })).toHaveValue('Untitled category')
  })

  it('closes with Cancel, Escape or a click on the backdrop', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<Harness onClose={onClose} />)

    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledTimes(1)

    fireEvent(dialog, new Event('cancel', { cancelable: true }))
    expect(onClose).toHaveBeenCalledTimes(2)

    // A click inside the form is not a click on the backdrop.
    await user.click(within(dialog).getByLabelText(/^Name/))
    expect(onClose).toHaveBeenCalledTimes(2)
    await user.click(dialog)
    expect(onClose).toHaveBeenCalledTimes(3)
  })

  it('does not close while a save is in flight', async () => {
    const save = deferred<[number, unknown]>()
    mock.onPost('/api/dishes').reply(() => save.promise)
    const onClose = vi.fn()

    const user = userEvent.setup()
    renderWithProviders(<Harness onClose={onClose} />)

    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText(/^Name/), 'Lamb')
    await user.click(within(dialog).getByRole('button', { name: 'Add dish' }))
    await waitFor(() => expect(mock.history.post.some((r) => r.url === '/api/dishes')).toBe(true))

    fireEvent(dialog, new Event('cancel', { cancelable: true }))
    fireEvent.click(dialog)
    expect(onClose).not.toHaveBeenCalled()

    save.resolve([201, { data: makeDish({ id: 7 }) }])
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
  })

  it('rejects a negative price before anything is sent', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Harness />)

    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText(/^Name/), 'Lamb')
    await user.type(within(dialog).getByLabelText(/^Price/), '-3')
    await user.click(within(dialog).getByRole('button', { name: 'Add dish' }))

    expect(await within(dialog).findByText('A price cannot be negative.')).toBeInTheDocument()
    expect(mock.history.post.filter((r) => r.url === '/api/dishes')).toHaveLength(0)
  })
  it('tells the owner when adding a dish fails', async () => {
    mock.onPost('/api/dishes').reply(500, { message: 'Server error', code: 'server_error' })
    const onClose = vi.fn()

    const user = userEvent.setup()
    renderWithProviders(<Harness onClose={onClose} />)

    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText(/^Name/), 'Lamb')
    await user.click(within(dialog).getByRole('button', { name: 'Add dish' }))

    expect(await screen.findByText('Could not add that dish')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('adds one dish when Add is clicked twice in a row', async () => {
    mock.onPost('/api/dishes').reply(201, { data: makeDish({ id: 7, category_id: 2 }) })

    const user = userEvent.setup()
    renderWithProviders(<Harness />)

    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText(/^Name/), 'Lamb')
    await user.click(within(dialog).getByRole('combobox', { name: /Category/ }))
    await user.click(await screen.findByRole('option', { name: 'Mains' }))

    // A double click: both land before the button can re-render as busy.
    const add = within(dialog).getByRole('button', { name: 'Add dish' })
    fireEvent.click(add)
    fireEvent.click(add)

    await waitFor(() =>
      expect(mock.history.post.filter((r) => r.url === '/api/dishes')).toHaveLength(1),
    )
  })
})
