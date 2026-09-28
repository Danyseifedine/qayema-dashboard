import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LimitBadge } from '@/shared/components/data-display/badges/limit-badge'

describe('LimitBadge', () => {
  it('shows only the count when the package is unlimited', () => {
    render(<LimitBadge used={42} limit={null} className="ms-1" />)

    const badge = screen.getByText('42')
    expect(badge).toHaveTextContent(/^42$/)
    expect(badge).not.toHaveAttribute('dir')
    expect(badge).toHaveClass('text-[var(--muted)]', 'ms-1')
    expect(screen.queryByText(/\//)).not.toBeInTheDocument()
  })

  it('shows used against the limit, left to right, in a quiet tone', () => {
    render(<LimitBadge used={3} limit={20} />)

    const badge = screen.getByText('3 / 20')
    expect(badge).toHaveAttribute('dir', 'ltr')
    expect(badge).toHaveClass('bg-[var(--hover-wash)]')
  })

  it('stays quiet just under 80%', () => {
    render(<LimitBadge used={15} limit={20} />)

    expect(screen.getByText('15 / 20')).toHaveClass('bg-[var(--hover-wash)]')
  })

  it('turns gold from 80% of the limit', () => {
    render(<LimitBadge used={16} limit={20} />)

    const badge = screen.getByText('16 / 20')
    expect(badge).toHaveClass('bg-accent-wash', 'text-accent')
    expect(badge).not.toHaveClass('bg-status-danger-wash')
  })

  it('turns red once the limit is reached', () => {
    render(<LimitBadge used={20} limit={20} />)

    const badge = screen.getByText('20 / 20')
    expect(badge).toHaveClass('bg-status-danger-wash', 'text-status-danger')
    expect(badge).not.toHaveClass('bg-accent-wash')
  })

  it('stays red over the limit', () => {
    render(<LimitBadge used={25} limit={20} />)

    expect(screen.getByText('25 / 20')).toHaveClass('text-status-danger')
  })

  it('is full at a limit of zero', () => {
    render(<LimitBadge used={0} limit={0} />)

    expect(screen.getByText('0 / 0')).toHaveClass('text-status-danger')
  })
})
