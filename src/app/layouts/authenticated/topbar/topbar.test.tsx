import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PackagePill } from '@/app/layouts/authenticated/topbar/package-pill'
import { Topbar, type TopbarProps } from '@/app/layouts/authenticated/topbar/topbar'

function renderTopbar(props: Partial<TopbarProps> = {}) {
  const handlers = {
    onLocaleChange: vi.fn(),
    onOpenMobileNav: vi.fn(),
    onOpenPackage: vi.fn(),
    onOpenAccount: vi.fn(),
    onLogout: vi.fn(),
  }
  render(
    <Topbar
      title="Overview"
      user={{ name: 'Dany', email: 'owner@example.com' }}
      packageName="Pro"
      packageEndingSoon={false}
      locale="en"
      {...handlers}
      {...props}
    />,
  )
  return handlers
}

describe('PackagePill', () => {
  it('names the package and opens it', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    render(<PackagePill label="Pro" onClick={onClick} />)

    const pill = screen.getByRole('button', { name: 'Pro package. Open your package.' })
    await user.click(pill)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('says when the package is ending soon', () => {
    render(<PackagePill label="Pro" endingSoon />)

    expect(
      screen.getByRole('button', { name: 'Pro package, ending soon. Open your package.' }),
    ).toBeInTheDocument()
  })
})

describe('Topbar', () => {
  it('shows the title, and a subtitle only when there is one', () => {
    renderTopbar()
    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument()
    expect(screen.queryByText('qayema.test/beit-qayema')).not.toBeInTheDocument()
  })

  it('renders the subtitle it is given', () => {
    renderTopbar({ subtitle: <span>qayema.test/beit-qayema</span> })
    expect(screen.getByText('qayema.test/beit-qayema')).toBeInTheDocument()
  })

  it('opens the mobile navigation and the package', async () => {
    const user = userEvent.setup()
    const { onOpenMobileNav, onOpenPackage } = renderTopbar({ packageEndingSoon: true })

    await user.click(screen.getByRole('button', { name: 'Open navigation' }))
    await user.click(screen.getByRole('button', { name: /Pro package, ending soon/ }))

    expect(onOpenMobileNav).toHaveBeenCalledOnce()
    expect(onOpenPackage).toHaveBeenCalledOnce()
  })
})
