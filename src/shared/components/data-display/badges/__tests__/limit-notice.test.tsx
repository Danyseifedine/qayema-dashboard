import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { isAtLimit } from '@/shared/components/data-display/badges/is-at-limit'
import { LimitNotice } from '@/shared/components/data-display/badges/limit-notice'

describe('LimitNotice', () => {
  it('counts what is used against the package', () => {
    render(<LimitNotice used={7} limit={20} />)

    expect(screen.getByText('7 / 20')).toBeInTheDocument()
    expect(screen.getByText('on your package')).toBeInTheDocument()
  })

  it('shows nothing when the package has no limit', () => {
    const { container } = render(<LimitNotice used={7} limit={null} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('is at its limit only once a real limit is used up', () => {
    expect(isAtLimit(undefined)).toBe(false)
    expect(isAtLimit({ used: 99, limit: null })).toBe(false)
    expect(isAtLimit({ used: 1, limit: 2 })).toBe(false)
    expect(isAtLimit({ used: 2, limit: 2 })).toBe(true)
    expect(isAtLimit({ used: 0, limit: 0 })).toBe(true)
  })
})
