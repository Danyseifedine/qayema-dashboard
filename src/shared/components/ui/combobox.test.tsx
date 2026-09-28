import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Combobox, type ComboboxOption } from '@/shared/components/ui/combobox'

const OPTIONS: ComboboxOption[] = [
  { value: 'LB', label: 'LB +961', description: 'Lebanon', leading: <span>🇱🇧</span> },
  { value: 'AE', label: 'AE +971', description: 'United Arab Emirates' },
  { value: 'EG', label: 'EG +20', description: 'Egypt' },
  { value: 'MX', label: 'MX +52', description: 'Mexico', disabled: true },
]

function Harness({
  onChange = vi.fn(),
  ...props
}: Partial<React.ComponentProps<typeof Combobox>> = {}) {
  const [value, setValue] = useState<string | null>(props.value ?? null)
  return (
    <Combobox
      aria-label="Country"
      options={OPTIONS}
      placeholder="Pick one"
      {...props}
      value={value}
      onChange={(next) => {
        setValue(next)
        onChange(next)
      }}
    />
  )
}

const input = () => screen.getByRole('combobox', { name: 'Country' })

describe('Combobox', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('opens on click and lists every option', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(input())

    const list = screen.getByRole('listbox')
    expect(within(list).getAllByRole('option')).toHaveLength(4)
  })

  it('opens with ArrowDown from the keyboard', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    input().focus()
    await user.keyboard('{ArrowDown}')

    expect(screen.getByRole('listbox')).toBeVisible()
  })

  it('filters by label and by description', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(input())
    await user.keyboard('leban')

    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(1))
    expect(screen.getByRole('option')).toHaveTextContent('Lebanon')

    await user.clear(input())
    await user.keyboard('+971')
    await waitFor(() => expect(screen.getByRole('option')).toHaveTextContent('AE +971'))
  })

  it('shows the empty text when nothing matches', async () => {
    const user = userEvent.setup()
    render(<Harness emptyText="No countries" />)

    await user.click(input())
    await user.keyboard('zzzz')

    expect(await screen.findByText('No countries')).toBeInTheDocument()
    expect(screen.queryByRole('option')).not.toBeInTheDocument()
  })

  it('selects with Enter and reports the value', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} />)

    await user.click(input())
    await user.keyboard('egy{Enter}')

    expect(onChange).toHaveBeenCalledWith('EG')
    await waitFor(() => expect(input()).toHaveValue('EG +20'))
  })

  it('marks the selected option and gives it a tick', async () => {
    const user = userEvent.setup()
    render(<Harness value="AE" />)

    // The chosen value is shown while the field is at rest.
    expect(input()).toHaveValue('AE +971')

    await user.click(input())

    // Opening a searchable list clears the box so a filter can be typed; the
    // chosen row stays marked in the list.
    expect(input()).toHaveValue('')
    const selected = screen.getByRole('option', { name: /AE \+971/ })
    expect(selected.className).toContain('bg-accent-wash')
  })

  it('restores the chosen label when the field loses focus', async () => {
    const user = userEvent.setup()
    render(
      <>
        <Harness value="AE" />
        <button type="button">elsewhere</button>
      </>,
    )

    await user.click(input())
    await user.keyboard('egy')
    expect(input()).toHaveValue('egy')

    await user.click(screen.getByRole('button', { name: 'elsewhere' }))

    await waitFor(() => expect(input()).toHaveValue('AE +971'))
  })

  it('closes on Escape and stops the event reaching a surrounding dialog', async () => {
    const user = userEvent.setup()
    const onKeyDown = vi.fn()
    render(
      <div onKeyDown={onKeyDown}>
        <Harness />
      </div>,
    )

    await user.click(input())
    expect(screen.getByRole('listbox')).toBeVisible()

    await user.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('option')).not.toBeInTheDocument())
    // The dialog's cancel must not also fire, so the keydown is defaultPrevented.
    expect(onKeyDown).toHaveBeenCalled()
    expect(onKeyDown.mock.calls.at(-1)?.[0].defaultPrevented).toBe(true)
  })

  it('jumps the highlight by first letter when it is not searchable', async () => {
    const user = userEvent.setup()
    render(<Harness searchable={false} />)

    await user.click(input())
    await user.keyboard('e')

    // Typeahead moves the highlight rather than filtering the list.
    const egypt = screen.getByRole('option', { name: /EG \+20/ })
    await waitFor(() => expect(input()).toHaveAttribute('aria-activedescendant', egypt.id))
    expect(screen.getAllByRole('option')).toHaveLength(4)
    expect(input()).toHaveAttribute('readonly')
  })

  it('renders without its own field shell when embedded', () => {
    const { container } = render(<Harness embedded />)

    expect(container.querySelector('[data-disabled]')).toBeNull()
    expect(input()).toHaveClass('cursor-text')
  })

  it('does not open when disabled', async () => {
    const user = userEvent.setup()
    render(<Harness disabled />)

    await user.click(input())

    expect(screen.queryByRole('option')).not.toBeInTheDocument()
  })

  it('shows the default empty text', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(input())
    await user.keyboard('zzzz')

    expect(await screen.findByText('No matches')).toBeInTheDocument()
  })

  it('filters options that have no description, by label or value', async () => {
    const user = userEvent.setup()
    render(
      <Harness
        options={[
          { value: 'starters', label: 'Starters' },
          { value: 'mains', label: 'Mains' },
        ]}
      />,
    )

    await user.click(input())
    await user.keyboard('main')

    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(1))
    expect(screen.getByRole('option')).toHaveTextContent('Mains')
  })

  it('ticks a chosen option that has no description', async () => {
    const user = userEvent.setup()
    render(<Harness options={[{ value: 'a', label: 'Alpha' }]} value="a" />)

    await user.click(input())

    const option = screen.getByRole('option', { name: 'Alpha' })
    expect(option.querySelector('svg')).toHaveClass('ms-auto')
  })

  it('shows the chosen option’s leading adornment beside the text', () => {
    render(<Harness value="LB" />)

    expect(input()).toHaveValue('LB +961')
    expect(input()).toHaveClass('ps-2')
    expect(screen.getByText('🇱🇧')).toBeInTheDocument()
  })

  it('clears the choice with Escape on a closed list', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness value="AE" onChange={onChange} />)

    input().focus()
    await user.keyboard('{Escape}')

    expect(onChange).toHaveBeenCalledWith(null)
    await waitFor(() => expect(input()).toHaveValue(''))
  })

  it('opens and highlights by typeahead from a closed list', async () => {
    const user = userEvent.setup()
    render(<Harness searchable={false} />)

    input().focus()
    await user.keyboard('a')

    const emirates = await screen.findByRole('option', { name: /AE \+971/ })
    expect(input()).toHaveAttribute('aria-activedescendant', emirates.id)
  })

  it('reads fast keystrokes as one typeahead word', async () => {
    const user = userEvent.setup()
    render(
      <Harness
        searchable={false}
        options={[
          { value: 'e1', label: 'Eat' },
          { value: 'e2', label: 'Egg' },
        ]}
      />,
    )

    await user.click(input())
    await user.keyboard('eg')

    const egg = screen.getByRole('option', { name: 'Egg' })
    await waitFor(() => expect(input()).toHaveAttribute('aria-activedescendant', egg.id))
  })

  it('starts a fresh typeahead word after a pause', async () => {
    const now = vi.spyOn(Date, 'now')
    const user = userEvent.setup()
    render(
      <Harness
        searchable={false}
        options={[
          { value: 'a', label: 'Apple' },
          { value: 'b', label: 'Banana' },
        ]}
      />,
    )

    await user.click(input())
    now.mockReturnValue(10_000)
    await user.keyboard('a')
    now.mockReturnValue(20_000)
    await user.keyboard('b')

    const banana = screen.getByRole('option', { name: 'Banana' })
    await waitFor(() => expect(input()).toHaveAttribute('aria-activedescendant', banana.id))
  })

  it('leaves the highlight alone when no option starts with the typed letter', async () => {
    const user = userEvent.setup()
    render(<Harness searchable={false} />)

    input().focus()
    await user.keyboard('z')

    expect(screen.queryByRole('option')).not.toBeInTheDocument()
  })

  it('ignores shortcut keys for typeahead', async () => {
    const user = userEvent.setup()
    render(<Harness searchable={false} />)

    input().focus()
    await user.keyboard('{Control>}e{/Control}')

    expect(screen.queryByRole('option')).not.toBeInTheDocument()
  })

  it('calls the caller’s blur handler when the field loses focus', async () => {
    const onBlur = vi.fn()
    const user = userEvent.setup()
    render(
      <>
        <Harness onBlur={onBlur} />
        <button type="button">elsewhere</button>
      </>,
    )

    await user.click(input())
    await user.click(screen.getByRole('button', { name: 'elsewhere' }))

    expect(onBlur).toHaveBeenCalled()
  })

  describe('which way it opens', () => {
    function placeAt(top: number, bottom: number) {
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
        top,
        bottom,
        left: 0,
        right: 0,
        width: 0,
        height: bottom - top,
        x: 0,
        y: top,
        toJSON: () => ({}),
      })
    }

    it('opens upward near the bottom of the window', async () => {
      placeAt(window.innerHeight - 60, window.innerHeight - 20)
      const user = userEvent.setup()
      render(<Harness />)

      await user.click(input())

      expect(screen.getByRole('listbox')).toHaveClass('bottom-[calc(100%+6px)]')
    })

    it('opens downward when there is even less room above', async () => {
      placeAt(0, window.innerHeight - 20)
      const user = userEvent.setup()
      render(<Harness />)

      await user.click(input())

      expect(screen.getByRole('listbox')).toHaveClass('top-[calc(100%+6px)]')
    })
  })
})
