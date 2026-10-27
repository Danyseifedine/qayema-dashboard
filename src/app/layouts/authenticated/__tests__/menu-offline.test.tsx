import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MenuGoingOffline, MenuOfflinePage } from '@/app/layouts/authenticated/menu-offline'

const lapsed = {
  slug: 'pro',
  tier: null,
  name: { en: 'Pro', ar: null },
  ended_at: '2026-10-01T00:00:00Z',
  offline_at: '2026-10-08T00:00:00Z',
  offline: false,
}

describe('MenuOfflinePage', () => {
  it('says the menu is offline since the package ended, and the way to renew', async () => {
    const onOpenPackage = vi.fn()
    const user = userEvent.setup()
    render(<MenuOfflinePage lapsed={lapsed} locale="en" onOpenPackage={onOpenPackage} />)

    expect(screen.getByText('Your menu is offline')).toBeInTheDocument()
    expect(screen.getByText(/Your Pro package ended on Oct 1, 2026/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Ask to renew' }))
    expect(onOpenPackage).toHaveBeenCalledOnce()
  })

  it('falls back to the slug, and leaves out a date it does not have', () => {
    render(
      <MenuOfflinePage
        lapsed={{ ...lapsed, name: { en: null, ar: null }, ended_at: null }}
        locale="en"
        onOpenPackage={vi.fn()}
      />,
    )

    expect(screen.getByText(/Your pro package ended on ,/)).toBeInTheDocument()
  })
})

describe('MenuGoingOffline', () => {
  it('says when the menu goes offline in the grace days', () => {
    render(<MenuGoingOffline lapsed={lapsed} locale="en" onOpenPackage={vi.fn()} />)

    expect(screen.getByText('Your Pro package ended on Oct 1, 2026')).toBeInTheDocument()
    expect(screen.getByText(/goes offline on Oct 8, 2026/)).toBeInTheDocument()
  })

  it('names no package and no day it does not know', () => {
    render(
      <MenuGoingOffline
        lapsed={{ ...lapsed, slug: null, name: { en: null, ar: null }, offline_at: null }}
        locale="en"
        onOpenPackage={vi.fn()}
      />,
    )

    expect(screen.getByText(/goes offline on unless/)).toBeInTheDocument()
  })
})
