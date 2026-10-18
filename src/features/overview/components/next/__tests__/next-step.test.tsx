import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { NextStep } from '@/features/overview/components/next/next-step'
import type { ChecklistItem } from '@/features/overview/utils/menu-checklist-items'

const item = (id: string, done: boolean): ChecklistItem => ({
  id,
  label: id === 'cover' ? 'A cover photo' : 'Something new',
  hint: 'Why it matters.',
  done,
  action: { label: 'Add', target: 'restaurant' },
})

describe('NextStep', () => {
  it('leads to the next thing missing, from its box or its button', async () => {
    const onOpen = vi.fn()
    const user = userEvent.setup()
    render(
      <NextStep
        items={[item('logo', true), item('cover', false), item('odd', false)]}
        onOpen={onOpen}
        stepsShown={false}
        onToggleSteps={vi.fn()}
      />,
    )

    expect(screen.getByText('1 of 3 done')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Next: A cover photo/ }))
    await user.click(screen.getByRole('button', { name: 'Add a cover photo' }))
    expect(onOpen).toHaveBeenCalledTimes(2)
    expect(onOpen).toHaveBeenLastCalledWith('restaurant')
  })

  it('draws a plain tick for a step it has no picture for, and hides the steps on request', async () => {
    const onToggleSteps = vi.fn()
    const user = userEvent.setup()
    render(
      <NextStep
        items={[item('odd', false)]}
        onOpen={vi.fn()}
        stepsShown
        onToggleSteps={onToggleSteps}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Hide the steps' }))
    expect(onToggleSteps).toHaveBeenCalledOnce()
  })

  it('shows nothing once every step is done', () => {
    const { container } = render(
      <NextStep
        items={[item('logo', true)]}
        onOpen={vi.fn()}
        stepsShown={false}
        onToggleSteps={vi.fn()}
      />,
    )

    expect(container).toBeEmptyDOMElement()
  })
})
