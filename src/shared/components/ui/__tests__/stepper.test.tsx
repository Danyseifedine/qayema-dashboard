import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Stepper } from '@/shared/components/ui/stepper'

const STEPS = [
  { id: 'one', name: 'Picture' },
  { id: 'two', name: 'Where' },
  { id: 'three', name: 'Review' },
]

describe('Stepper', () => {
  it('names each step, ticks those passed and opens only those reached', async () => {
    const user = userEvent.setup()
    const onGo = vi.fn()
    render(<Stepper label="Steps" steps={STEPS} current={1} reached={1} onGo={onGo} />)

    const nav = screen.getByRole('navigation', { name: 'Steps' })
    expect(nav).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Step 1: Picture, done' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Step 2: Where' })).toHaveAttribute(
      'aria-current',
      'step',
    )
    expect(screen.getByRole('button', { name: 'Step 3: Review' })).toBeDisabled()
    expect(screen.getByText('Step 2 of 3: Where')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Step 1: Picture, done' }))
    expect(onGo).toHaveBeenCalledWith(0)
  })
})
