import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HelperText } from '@/shared/components/ui/helper-text'

describe('HelperText', () => {
  it('is muted by default', () => {
    render(<HelperText id="hint">A hint</HelperText>)

    const text = screen.getByText('A hint')
    expect(text.tagName).toBe('P')
    expect(text).toHaveAttribute('id', 'hint')
    expect(text).toHaveClass('text-[var(--muted)]')
  })

  it.each([
    ['error', 'text-status-danger'],
    ['success', 'text-status-success'],
    ['warning', 'text-status-warn'],
  ] as const)('shows the %s tone', (tone, className) => {
    render(<HelperText tone={tone}>Line</HelperText>)

    const text = screen.getByText('Line')
    expect(text).toHaveClass(className)
    expect(text).not.toHaveClass('text-[var(--muted)]')
  })

  it('takes a class', () => {
    render(<HelperText className="text-end">Line</HelperText>)

    expect(screen.getByText('Line')).toHaveClass('text-end')
  })
})
