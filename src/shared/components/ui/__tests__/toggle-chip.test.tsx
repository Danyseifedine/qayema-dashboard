import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ToggleChip } from '@/shared/components/ui/toggle-chip'

describe('ToggleChip', () => {
  it('says whether it is on, turns gold while on and reports a press', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    const { rerender } = render(
      <ToggleChip on={false} title="Monday" onClick={onClick}>
        Mon
      </ToggleChip>,
    )

    const chip = screen.getByRole('button', { name: 'Mon' })
    expect(chip).toHaveAttribute('aria-pressed', 'false')
    expect(chip).toHaveAttribute('title', 'Monday')
    expect(chip).not.toHaveClass('bg-gold')

    await user.click(chip)
    expect(onClick).toHaveBeenCalledOnce()

    rerender(
      <ToggleChip on aria-label="Halves" onClick={onClick}>
        2
      </ToggleChip>,
    )
    expect(screen.getByRole('button', { name: 'Halves' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Halves' })).toHaveClass('bg-gold')
  })
})
