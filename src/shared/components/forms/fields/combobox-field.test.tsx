import { zodResolver } from '@hookform/resolvers/zod'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { ComboboxField } from './combobox-field'

const OPTIONS = [
  { value: '1', label: 'Starters' },
  { value: '2', label: 'Mains' },
]

const schema = z.object({
  category_id: z.number('Choose a category.').int().nullable(),
})
type Values = z.infer<typeof schema>

function Harness({ onSubmit = vi.fn() }: { onSubmit?: (v: Values) => void }) {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { category_id: null },
  })

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <ComboboxField
        control={form.control}
        name="category_id"
        label="Category"
        options={OPTIONS}
        numeric
        searchable={false}
      />
      <button type="submit">Save</button>
    </form>
  )
}

describe('ComboboxField', () => {
  it('stores a numeric option as a number, not a string', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<Harness onSubmit={onSubmit} />)

    await user.click(screen.getByRole('combobox', { name: /Category/ }))
    await user.click(screen.getByRole('option', { name: 'Mains' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0]![0]).toEqual({ category_id: 2 })
  })

  it('surfaces the schema error when nothing is chosen', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<Harness onSubmit={onSubmit} />)

    await user.click(screen.getByRole('button', { name: 'Save' }))

    // `null` is allowed by this schema, so submitting is fine; the point is
    // the field starts empty rather than defaulting to a real id.
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0]![0]).toEqual({ category_id: null })
  })

  it('marks the control invalid when the field has an error', async () => {
    function Invalid() {
      const form = useForm<{ category_id: number | null }>({
        defaultValues: { category_id: null },
      })
      return (
        <>
          <ComboboxField
            control={form.control}
            name="category_id"
            label="Category"
            options={OPTIONS}
            numeric
          />
          <button
            type="button"
            onClick={() => form.setError('category_id', { message: 'Choose a category.' })}
          >
            Break
          </button>
        </>
      )
    }

    const user = userEvent.setup()
    render(<Invalid />)
    await user.click(screen.getByRole('button', { name: 'Break' }))

    expect(await screen.findByText('Choose a category.')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /Category/ })).toHaveAttribute(
      'aria-invalid',
      'true',
    )
  })
})
