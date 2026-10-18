import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
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
})
