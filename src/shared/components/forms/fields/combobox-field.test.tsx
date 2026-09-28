import { zodResolver } from '@hookform/resolvers/zod'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm, useWatch } from 'react-hook-form'
import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { ComboboxField } from '@/shared/components/forms/fields/combobox-field'

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

  describe('what it stores', () => {
    function Stored({
      numeric,
      initial,
      options = OPTIONS,
    }: {
      numeric?: boolean
      initial: string | number | null | undefined
      options?: { value: string; label: string }[]
    }) {
      const form = useForm<{ pick?: string | number | null }>({
        defaultValues: initial === undefined ? {} : { pick: initial },
      })
      const pick = useWatch({ control: form.control, name: 'pick' })
      return (
        <>
          <ComboboxField
            control={form.control}
            name="pick"
            label="Pick"
            options={options}
            numeric={numeric}
            hint="Choose one."
            required
            optionalText="Optional"
            placeholder="Choose"
            emptyText="Nothing here"
            className="mt-3"
          />
          <output data-testid="value">{pick === undefined ? 'unset' : JSON.stringify(pick)}</output>
        </>
      )
    }

    const box = () => screen.getByRole('combobox', { name: /^Pick/ })
    const stored = () => screen.getByTestId('value').textContent

    it('stores the value as text when not numeric', async () => {
      const user = userEvent.setup()
      render(<Stored initial={null} />)

      await user.click(box())
      await user.click(screen.getByRole('option', { name: 'Starters' }))

      expect(stored()).toBe('"1"')
    })

    it('shows a stored number as its option', () => {
      render(<Stored numeric initial={2} />)

      expect(box()).toHaveValue('Mains')
      expect(box()).toHaveAccessibleDescription('Choose one.')
      expect(box()).toHaveAttribute('placeholder', 'Choose')
    })

    it('shows nothing chosen for an unset value', () => {
      render(<Stored initial={undefined} />)

      expect(box()).toHaveValue('')
    })

    it('stores null when a numeric choice is cleared', async () => {
      const user = userEvent.setup()
      render(<Stored numeric initial={2} />)

      box().focus()
      await user.keyboard('{Escape}')

      await waitFor(() => expect(stored()).toBe('null'))
    })

    it('stores null rather than NaN for a non-numeric option', async () => {
      const user = userEvent.setup()
      render(<Stored numeric initial={1} options={[...OPTIONS, { value: 'x', label: 'Other' }]} />)

      await user.click(box())
      await user.click(screen.getByRole('option', { name: 'Other' }))

      await waitFor(() => expect(stored()).toBe('null'))
    })

    it('shows its own empty text', async () => {
      const user = userEvent.setup()
      render(<Stored initial={null} />)

      await user.click(box())
      await user.keyboard('zzz')

      expect(await screen.findByText('Nothing here')).toBeInTheDocument()
    })
  })
})
