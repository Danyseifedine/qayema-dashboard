import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { i18n } from '@/lib/i18n'
import { ChangeLine } from '@/shared/components/data-display/stats/change-line'

describe('ChangeLine', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('shows a rise in green with an up arrow, then what it is measured against', () => {
    const { container } = render(<ChangeLine change={0.124} against="vs before" />)

    const change = screen.getByText('+12%')
    expect(change).toHaveAttribute('dir', 'ltr')
    expect(change).toHaveClass('text-status-success')
    expect(change.querySelector('svg')).toHaveClass('tabler-icon-arrow-up')
    expect(container).toHaveTextContent('+12%vs before')
  })

  it('shows a fall in red with a down arrow', () => {
    render(<ChangeLine change={-0.5} against="vs before" />)

    const change = screen.getByText('-50%')
    expect(change).toHaveClass('text-status-danger')
    expect(change.querySelector('svg')).toHaveClass('tabler-icon-arrow-down')
  })

  it('shows a change that rounds to 0% as level, in grey', () => {
    render(<ChangeLine change={0.004} against="vs. yesterday" />)

    const change = screen.getByText('0%')
    expect(change).toHaveClass('text-[var(--muted)]')
    expect(change.querySelector('svg')).toHaveClass('tabler-icon-minus')
  })

  it('shows the count itself as the rise from nothing before', () => {
    render(<ChangeLine change={null} count={1200} against="vs. yesterday" />)

    expect(screen.getByText('+1,200')).toHaveClass('text-status-success')
  })

  it('says there is nothing to compare with when nothing came before and no count is given', () => {
    const { container } = render(<ChangeLine change={null} against="vs before" />)

    expect(container).toHaveTextContent('Nothing to compare yet')
    expect(container).not.toHaveTextContent('vs before')
  })

  it("writes the number in the reader's language, with Western digits", async () => {
    await i18n.changeLanguage('ar')
    render(<ChangeLine change={12.5} against="vs before" />)

    expect(screen.getByText('+1,250%')).toBeInTheDocument()
  })

  it('lays out as its caller says: beside or under the change', () => {
    const { container } = render(
      <ChangeLine change={0.2} against="vs. yesterday" className="flex flex-col" />,
    )

    expect(container.firstChild).toHaveClass('flex', 'flex-col')
  })
})
