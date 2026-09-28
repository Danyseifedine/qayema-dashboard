import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Switch } from '@/shared/components/ui/switch'

describe('Switch', () => {
  it('reports the opposite of its state when clicked', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    const { rerender } = render(<Switch checked={false} onChange={onChange} aria-label="Orders" />)

    const control = screen.getByRole('switch', { name: 'Orders' })
    expect(control).toHaveAttribute('aria-checked', 'false')
    expect(control).toHaveClass('bg-[var(--line-strong)]')

    await user.click(control)
    expect(onChange).toHaveBeenLastCalledWith(true)

    rerender(<Switch checked onChange={onChange} aria-label="Orders" />)
    expect(control).toHaveAttribute('aria-checked', 'true')
    expect(control).toHaveClass('bg-accent-fill')

    await user.click(control)
    expect(onChange).toHaveBeenLastCalledWith(false)
  })

  it('toggles from the keyboard', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Switch checked={false} onChange={onChange} aria-label="Orders" />)

    screen.getByRole('switch').focus()
    await user.keyboard(' ')

    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('ignores clicks when disabled', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Switch checked={false} onChange={onChange} disabled aria-label="Orders" />)

    await user.click(screen.getByRole('switch'))

    expect(screen.getByRole('switch')).toBeDisabled()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('passes its id, name and aria wiring through', () => {
    render(
      <>
        <span id="lbl">Available</span>
        <span id="desc">Guests can order it.</span>
        <Switch
          checked
          onChange={vi.fn()}
          id="available"
          name="available"
          aria-labelledby="lbl"
          aria-describedby="desc"
          className="ms-2"
        />
      </>,
    )

    const control = screen.getByRole('switch', { name: 'Available' })
    expect(control).toHaveAttribute('id', 'available')
    expect(control).toHaveAttribute('name', 'available')
    expect(control).toHaveAccessibleDescription('Guests can order it.')
    expect(control).toHaveClass('ms-2')
  })
})
