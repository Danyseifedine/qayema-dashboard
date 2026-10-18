import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IconChartBar } from '@tabler/icons-react'
import { describe, expect, it, vi } from 'vitest'
import { LockedState } from '@/shared/components/feedback/states/locked-state'

describe('LockedState', () => {
  it('shows what it would give, the package that has it and the way to ask', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    render(
      <LockedState
        icon={IconChartBar}
        title="Analytics"
        description="See how guests use your menu."
        includes={['Views per day', 'Top dishes']}
        unlockedBy="Pro"
        action={{ label: 'See packages', onClick }}
      >
        <p>312 views this week</p>
      </LockedState>,
    )

    expect(screen.getByRole('heading', { name: 'Analytics' })).toBeInTheDocument()
    expect(screen.getByText('Pro')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      '•Views per day',
      '•Top dishes',
    ])
    expect(screen.getByText('312 views this week')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'See packages' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('shows no list or chip without them', () => {
    render(
      <LockedState
        icon={IconChartBar}
        title="Analytics"
        description="x"
        includes={[]}
        action={{ label: 'See packages', onClick: vi.fn() }}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Analytics' })).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })
})
