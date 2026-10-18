import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Money } from '@/shared/components/data-display/formatters/money'

describe('Money', () => {
  it('shows a price left to right with tabular digits', () => {
    render(<Money amount={12.5} currency="USD" className="font-medium" />)

    const price = screen.getByText('$12.50')
    expect(price).toHaveAttribute('dir', 'ltr')
    expect(price).toHaveClass('tabular-nums', 'font-medium')
  })

  it('formats for the reader’s language', () => {
    const { container } = render(<Money amount={12.5} currency="USD" locale="ar" />)

    expect(container.textContent).not.toBe('$12.50')
    expect(container.textContent).toMatch(/[١٢]/)
  })
})
