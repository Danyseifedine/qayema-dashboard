import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { makeCategory, makeDish, resetFactories } from '@/test/mocks/factories/menu'
import { renderWithProviders } from '@/test/utils/render-with-providers'
import type { Category } from '../../../categories/schemas/category.schema'
import { DishDialog } from './dish-dialog'

let mock: MockAdapter

const CATEGORIES = [
  makeCategory({ id: 1, name: { en: 'Starters', ar: null } }),
  makeCategory({ id: 2, name: { en: 'Mains', ar: null } }),
]

function Harness({
  categories = CATEGORIES,
  dish = null,
  onOpenCategories = vi.fn(),
  onClose = vi.fn(),
}: {
  categories?: Category[]
  dish?: ReturnType<typeof makeDish> | null
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
        categories={[...categories]}
        defaultCategoryId={null}
        currency="USD"
        locale="en"
        onClose={onClose}
        onOpenCategories={onOpenCategories}
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
  })

  afterEach(() => {
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
})
