import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BarChart3 } from 'lucide-react'
import { describe, expect, it, vi } from 'vitest'
import { LockedState } from '@/shared/components/feedback/states/locked-state'

describe('LockedState', () => {
  it('shows what is locked without a list, chip or action by default', () => {
    render(
      <LockedState
        icon={BarChart3}
        title="Analytics"
        description="See how guests use your menu."
      />,
    )

    expect(screen.getByRole('heading', { name: 'Analytics' })).toBeInTheDocument()
    expect(screen.getByText('See how guests use your menu.')).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows what it would give, the package that has it and the way to ask', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    render(
      <LockedState
        icon={BarChart3}
        title="Analytics"
        description="See how guests use your menu."
        includes={['Views per day', 'Top dishes']}
        unlockedBy="Pro"
        action={{ label: 'See packages', onClick }}
        className="mt-2"
      >
        <p>312 views this week</p>
      </LockedState>,
    )

    expect(screen.getByRole('heading', { name: /Analytics.*Pro/ })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      '•Views per day',
      '•Top dishes',
    ])
    expect(screen.getByText('312 views this week')).toBeInTheDocument()
    expect(screen.getByRole('heading').closest('section')).toHaveClass('mt-2')

    await user.click(screen.getByRole('button', { name: 'See packages' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('shows no list for an empty includes', () => {
    render(<LockedState icon={BarChart3} title="Analytics" description="x" includes={[]} />)

    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })
})
