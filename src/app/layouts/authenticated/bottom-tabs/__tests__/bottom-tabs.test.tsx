import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { phoneTabs } from '@/app/layouts/authenticated/nav-items'
import { BottomTabs } from '@/app/layouts/authenticated/bottom-tabs/bottom-tabs'
import { FULL_PLAN } from '@/test/factories/session'

const tabs = phoneTabs({ hasTemplate: true, plan: FULL_PLAN }, [])

describe('BottomTabs', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('marks the tab of the open page, and opens another', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<BottomTabs tabs={tabs} activeKey="categories" onSelect={onSelect} />)

    expect(screen.getByRole('button', { name: 'Menu' })).toHaveAttribute('aria-current', 'page')
    await user.click(screen.getByRole('button', { name: 'More' }))
    expect(onSelect).toHaveBeenCalledWith('more')
    expect(screen.getByRole('button', { name: 'More' })).toHaveAttribute('aria-current', 'page')
  })

  it('tells the page how tall it is, and forgets it when it goes', () => {
    let measure = () => {}
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          measure = callback
        }
        observe() {}
        disconnect() {}
      },
    )
    const { unmount } = render(<BottomTabs tabs={tabs} activeKey="overview" onSelect={vi.fn()} />)

    measure()
    expect(document.documentElement.style.getPropertyValue('--tabbar-height')).toMatch(/px$/)
    unmount()
    expect(document.documentElement.style.getPropertyValue('--tabbar-height')).toBe('')
  })
})
