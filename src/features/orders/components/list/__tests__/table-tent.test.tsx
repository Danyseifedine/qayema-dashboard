import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TableTent } from '@/features/orders/components/list/table-tent'

const label = (name: string) => render(<TableTent name={name} />).container.querySelector('text')

describe('TableTent', () => {
  it('shows the number in the table name, the last one when there are several', () => {
    expect(label('Table 12')).toHaveTextContent('12')
    expect(label('Floor 2 table 7')).toHaveTextContent('7')
  })

  it("shows a name's first letter when it has no number, and fits a long number smaller", () => {
    expect(label(' patio ')).toHaveTextContent('P')
    expect(label('Table 120')).toHaveAttribute('font-size', '24')
    expect(label('Table 12')).toHaveAttribute('font-size', '38')
  })

  it('is a picture only, hidden from screen readers', () => {
    const { container } = render(<TableTent name="Table 1" />)

    expect(container.firstElementChild).toHaveAttribute('aria-hidden')
  })
})
