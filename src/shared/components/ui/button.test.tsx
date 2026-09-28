import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from '@/shared/components/ui/button'

describe('Button', () => {
  it('is a primary, medium, non-submitting button by default', () => {
    render(<Button>Save</Button>)

    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toHaveAttribute('type', 'button')
    expect(button).toHaveClass('bg-gold', 'h-11')
    expect(button).not.toHaveClass('w-full')
    expect(button).not.toHaveAttribute('aria-busy')
    expect(button).toBeEnabled()
  })

  it('submits when asked to', () => {
    render(<Button type="submit">Save</Button>)

    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
  })

  it.each([
    ['secondary', 'bg-[var(--surface)]'],
    ['ghost', 'border-transparent'],
    ['danger', 'bg-danger'],
    ['link', 'underline-offset-4'],
  ] as const)('paints the %s variant', (variant, className) => {
    render(<Button variant={variant}>Go</Button>)

    expect(screen.getByRole('button')).toHaveClass(className)
  })

  it.each([
    ['sm', 'h-9'],
    ['lg', 'h-[50px]'],
    ['icon', 'size-10'],
  ] as const)('sizes to %s', (size, className) => {
    render(<Button size={size}>Go</Button>)

    expect(screen.getByRole('button')).toHaveClass(className)
  })

  it('stretches to the full width as a block', () => {
    render(<Button block>Go</Button>)

    expect(screen.getByRole('button')).toHaveClass('w-full')
  })

  it('lets the caller override a class', () => {
    render(<Button className="h-20">Go</Button>)

    const button = screen.getByRole('button')
    expect(button).toHaveClass('h-20')
    expect(button).not.toHaveClass('h-11')
  })

  it('shows both icons at rest', () => {
    render(
      <Button leadingIcon={<svg data-testid="lead" />} trailingIcon={<svg data-testid="trail" />}>
        Go
      </Button>,
    )

    expect(screen.getByTestId('lead')).toBeInTheDocument()
    expect(screen.getByTestId('trail')).toBeInTheDocument()
  })

  it('swaps the icons for a spinner and blocks clicks while loading', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    render(
      <Button
        loading
        onClick={onClick}
        leadingIcon={<svg data-testid="lead" />}
        trailingIcon={<svg data-testid="trail" />}
      >
        Save
      </Button>,
    )

    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button.querySelector('.animate-spin')).not.toBeNull()
    expect(screen.queryByTestId('lead')).not.toBeInTheDocument()
    expect(screen.queryByTestId('trail')).not.toBeInTheDocument()

    await user.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('does not fire when disabled', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    render(
      <Button disabled onClick={onClick}>
        Save
      </Button>,
    )

    await user.click(screen.getByRole('button'))

    expect(screen.getByRole('button')).toBeDisabled()
    expect(screen.getByRole('button')).not.toHaveAttribute('aria-busy')
    expect(onClick).not.toHaveBeenCalled()
  })

  it('fires its handler when clicked', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    render(<Button onClick={onClick}>Save</Button>)

    await user.click(screen.getByRole('button'))

    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
