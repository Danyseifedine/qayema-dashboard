import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PackagePill } from '@/app/layouts/authenticated/topbar/package-pill'
import { tierOf } from '@/app/layouts/authenticated/topbar/package-tier'
import { Topbar, type TopbarProps } from '@/app/layouts/authenticated/topbar/topbar'

function renderTopbar(props: Partial<TopbarProps> = {}) {
  const handlers = {
    onLocaleChange: vi.fn(),
    onBack: vi.fn(),
    onOpenPackage: vi.fn(),
    onOpenAccount: vi.fn(),
    onLogout: vi.fn(),
  }
  render(
    <Topbar
      title="Overview"
      user={{ name: 'Dany', login: 'owner@example.com' }}
      packageName="Pro"
      packageTier="silver"
      packageDaysLeft={null}
      locale="en"
      {...handlers}
      {...props}
    />,
  )
  return handlers
}

describe('tierOf', () => {
  it('draws Free in bronze, Pro in silver, Premium and Custom in gold', () => {
    expect(tierOf('free')).toBe('bronze')
    expect(tierOf('pro')).toBe('silver')
    expect(tierOf('premium')).toBe('gold')
    expect(tierOf('custom')).toBe('gold')
    expect(tierOf(null)).toBe('bronze')
    expect(tierOf('something-new')).toBe('bronze')
  })
})

describe('PackagePill', () => {
  it('is a crown in its metal, named for screen readers, with no text without an end', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    render(<PackagePill label="Pro" tier="silver" onClick={onClick} />)

    const pill = screen.getByRole('button', { name: 'Pro package. Open your package.' })
    expect(pill).toHaveAttribute('data-tier', 'silver')
    expect(pill).toHaveTextContent('')
    await user.click(pill)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it("edges the days in the crown's own metal", () => {
    const { rerender } = render(<PackagePill label="Premium" tier="gold" daysLeft={15} />)
    expect(screen.getByText('15')).toHaveClass('border-[#f7c843]')

    rerender(<PackagePill label="Pro" tier="silver" daysLeft={15} />)
    expect(screen.getByText('15')).toHaveClass('border-[#c9ced6]')
  })

  it('counts the days left on the corner of the crown, amber in the last week', () => {
    const { rerender } = render(<PackagePill label="Pro" tier="silver" daysLeft={23} />)

    let pill = screen.getByRole('button', { name: 'Pro package, 23 days left. Open your package.' })
    expect(pill).toHaveTextContent(/^23$/)
    expect(pill.querySelector('[data-ending-soon]')).toBeNull()

    rerender(<PackagePill label="Pro" tier="silver" daysLeft={1} />)
    pill = screen.getByRole('button', { name: 'Pro package, 1 day left. Open your package.' })
    expect(pill).toHaveTextContent(/^1$/)
    expect(pill.querySelector('[data-ending-soon]')).not.toBeNull()
  })

  it('shows 0 on its last day and 99+ past ninety-nine days', () => {
    const { rerender } = render(<PackagePill label="Pro" tier="silver" daysLeft={0} />)
    expect(
      screen.getByRole('button', { name: 'Pro package, ends today. Open your package.' }),
    ).toHaveTextContent(/^0$/)

    rerender(<PackagePill label="Pro" tier="silver" daysLeft={240} />)
    expect(
      screen.getByRole('button', { name: 'Pro package, 240 days left. Open your package.' }),
    ).toHaveTextContent(/^99\+$/)
  })
})

describe('Topbar', () => {
  it('shows a heading of its own instead of a bar, on Home and More', () => {
    renderTopbar({ hero: { eyebrow: 'Good morning,', title: 'Dany', subtitle: 'Your day.' } })

    expect(screen.getByText('Good morning,')).toBeInTheDocument()
    expect(screen.getByText('Dany')).toBeInTheDocument()
    expect(screen.getByText('Your day.')).toBeInTheDocument()
    expect(screen.getByRole('banner')).not.toHaveClass('sticky')
  })

  it('is a bar with no heading on the other pages', () => {
    renderTopbar()

    expect(screen.queryByText('Dany')).not.toBeInTheDocument()
    expect(screen.getByRole('banner')).toHaveClass('sticky')
  })

  it('names the page for screen readers only, and shows no menu link', () => {
    renderTopbar({ publicUrl: 'https://qayema.test/beit-qayema' })
    expect(screen.getByRole('heading', { level: 1, name: 'Overview' })).toHaveClass('sr-only')
    expect(screen.queryByText('qayema.test/beit-qayema')).not.toBeInTheDocument()
  })

  it('goes back, and opens the package', async () => {
    const user = userEvent.setup()
    const { onBack, onOpenPackage } = renderTopbar({ packageDaysLeft: 3 })

    await user.click(screen.getByRole('button', { name: 'Back' }))
    await user.click(screen.getByRole('button', { name: /Pro package, 3 days left/ }))

    expect(onBack).toHaveBeenCalledOnce()
    expect(onOpenPackage).toHaveBeenCalledOnce()
  })

  it('shows no back button where there is nowhere to go back to', () => {
    renderTopbar({ onBack: undefined })

    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument()
  })
})
