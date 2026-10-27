import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { makeCategory, resetFactories } from '@/test/factories/menu'
import { makeSessionUser } from '@/test/factories/session'
import { renderWithProviders } from '@/test/render-with-providers'
import { CategoryDialog } from '@/features/menu/categories/components/dialogs/category-dialog'
import { CategoryCard } from '@/features/menu/categories/components/list/category-card'
import { CATEGORY_ICONS, categoryIcon } from '@/features/menu/categories/constants/category-icons'
import { CategoryFilter } from '@/features/menu/components/filters/category-filter'
import type { Category } from '@/features/menu/categories/schemas/category.schema'

let mock: MockAdapter

function open(category: Category | null = null) {
  const onClose = vi.fn()
  mock.onGet('/api/user').reply(200, { data: makeSessionUser({ languages: ['en'] }) })
  mock.onPost('/api/categories').reply(201, { data: makeCategory({ id: 5 }) })
  mock.onPatch(/\/api\/categories\/\d+/).reply(200, { data: makeCategory({ id: 5 }) })
  renderWithProviders(<CategoryDialog open category={category} onClose={onClose} />)
  return { onClose }
}

const sent = (method: 'post' | 'patch') =>
  JSON.parse(mock.history[method][0]!.data as string) as Record<string, unknown>

describe('a category icon', () => {
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

  it('is picked from the grid, none first, and saved with the category', async () => {
    const user = userEvent.setup()
    const { onClose } = open()
    const icons = await screen.findByRole('group', { name: /Icon/ })
    expect(screen.getAllByRole('radio')).toHaveLength(CATEGORY_ICONS.length + 1)
    expect(screen.getByRole('radio', { name: 'No icon' })).toBeChecked()
    expect(icons).toBeInTheDocument()

    await user.type(screen.getByLabelText(/^Name/), 'Pizza')
    await user.click(screen.getByRole('radio', { name: 'Pizza' }))
    expect(screen.getByRole('radio', { name: 'Pizza' })).toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Add category' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(sent('post')).toMatchObject({ name: { en: 'Pizza' }, icon: 'pizza' })
  })

  it('opens on the saved icon and can be taken away', async () => {
    const user = userEvent.setup()
    const { onClose } = open(makeCategory({ id: 5, name: { en: 'Coffee' }, icon: 'coffee' }))

    expect(await screen.findByRole('radio', { name: 'Coffee' })).toBeChecked()
    await user.click(screen.getByRole('radio', { name: 'No icon' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(sent('patch')).toMatchObject({ icon: null })
  })

  it('shows on the card and on the filter chip, and an unknown one shows nothing', () => {
    const { container } = render(
      <>
        <CategoryCard
          category={makeCategory({ name: { en: 'Pizza' }, icon: 'pizza' })}
          locale="en"
          handle={null}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
        <CategoryCard
          category={makeCategory({ name: { en: 'Sides' }, icon: 'spaceship' })}
          locale="en"
          handle={null}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
        <CategoryFilter
          categories={[makeCategory({ id: 9, name: { en: 'Coffee' }, icon: 'coffee' })]}
          value={null}
          onChange={vi.fn()}
          orphanCount={0}
          locale="en"
        />
      </>,
    )

    expect(container.querySelectorAll('.tabler-icon-pizza')).toHaveLength(1)
    expect(
      screen.getByRole('tab', { name: /Coffee/ }).querySelector('.tabler-icon-coffee'),
    ).not.toBeNull()
    expect(categoryIcon('spaceship')).toBeNull()
    expect(categoryIcon(null)).toBeNull()
  })
})
