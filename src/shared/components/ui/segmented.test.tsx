import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Segmented, type SegmentedOption } from '@/shared/components/ui/segmented'

type Range = '7d' | '30d' | '90d'

const OPTIONS: SegmentedOption<Range>[] = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days', badge: '•' },
  {
    value: '90d',
    label: '90 days',
    disabled: true,
    title: 'Needs Pro',
    icon: <svg data-testid="lock" />,
  },
]

describe('Segmented', () => {
  it('renders a tab per option and marks the chosen one', () => {
    render(<Segmented aria-label="Range" value="7d" onChange={vi.fn()} options={OPTIONS} />)

    expect(screen.getByRole('tablist', { name: 'Range' })).toBeInTheDocument()
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(3)
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
    expect(tabs[0]).toHaveClass('bg-accent-wash')
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false')
    expect(tabs[1]).toHaveClass('text-[var(--muted)]')
  })

  it('reports the tab that was picked', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Segmented aria-label="Range" value="7d" onChange={onChange} options={OPTIONS} />)

    await user.click(screen.getByRole('tab', { name: /30 days/ }))

    expect(onChange).toHaveBeenCalledWith('30d')
  })

  it('shows but will not pick a disabled option', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Segmented aria-label="Range" value="7d" onChange={onChange} options={OPTIONS} />)

    const locked = screen.getByRole('tab', { name: /90 days/ })
    expect(locked).toBeDisabled()
    expect(locked).toHaveAttribute('title', 'Needs Pro')
    expect(screen.getByTestId('lock')).toBeInTheDocument()

    await user.click(locked)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('shows a badge beside an option that has one', () => {
    render(<Segmented aria-label="Range" value="7d" onChange={vi.fn()} options={OPTIONS} />)

    expect(screen.getByRole('tab', { name: /30 days/ })).toHaveTextContent('30 days•')
    expect(screen.getByRole('tab', { name: /^7 days$/ })).toHaveTextContent(/^7 days$/)
  })

  it('is medium by default and small on request', () => {
    const { rerender } = render(
      <Segmented aria-label="Range" value="7d" onChange={vi.fn()} options={OPTIONS} />,
    )
    expect(screen.getAllByRole('tab')[0]).toHaveClass('px-4')

    rerender(
      <Segmented
        aria-label="Range"
        value="7d"
        onChange={vi.fn()}
        options={OPTIONS}
        size="sm"
      />,
    )
    expect(screen.getAllByRole('tab')[0]).toHaveClass('px-3')
  })
})
