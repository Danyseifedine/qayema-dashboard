import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LocaleTabs } from '@/shared/components/forms/translatable/locale-tabs'

describe('LocaleTabs', () => {
  it('shows one tab per menu language, by code', () => {
    render(<LocaleTabs languages={['en', 'fr']} value="en" onChange={vi.fn()} />)

    expect(screen.getByRole('tablist', { name: 'Content language' })).toBeInTheDocument()
    const [en, fr] = screen.getAllByRole('tab')
    expect(en).toHaveTextContent(/^EN$/)
    expect(en).toHaveAttribute('aria-selected', 'true')
    expect(en).toHaveAttribute('title', 'English')
    expect(fr).toHaveTextContent(/^FR$/)
    expect(fr).toHaveAttribute('title', 'French')
  })

  it('marks a language that still needs attention', () => {
    render(
      <LocaleTabs languages={['en', 'fr']} value="en" onChange={vi.fn()} incomplete={['fr']} />,
    )

    expect(screen.getByRole('tab', { name: /FR/ })).toHaveTextContent('FR•')
    expect(screen.getByRole('tab', { name: /EN/ })).toHaveTextContent(/^EN$/)
  })

  it('reports the language that was picked', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(
      <LocaleTabs languages={['en', 'ar']} value="en" onChange={onChange} className="ms-auto" />,
    )

    await user.click(screen.getByRole('tab', { name: 'AR' }))

    expect(onChange).toHaveBeenCalledWith('ar')
    expect(screen.getByRole('tablist')).toHaveClass('ms-auto')
  })
})
