import { IconQrcode } from '@tabler/icons-react'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SidebarItem } from '@/app/layouts/authenticated/sidebar/sidebar-item'

/** The tooltip is drawn on <body>, hidden from screen readers (the row has the name). */
const tooltip = () => document.body.querySelector<HTMLElement>('body > [aria-hidden="true"]')

function renderItem(collapsed: boolean) {
  render(
    <SidebarItem
      icon={IconQrcode}
      label="QR code"
      collapsed={collapsed}
      badge={<span>3</span>}
      onSelect={vi.fn()}
    />,
  )
  const row = screen.getByRole('button', { name: /^QR code/ })
  vi.spyOn(row, 'getBoundingClientRect').mockReturnValue(
    DOMRect.fromRect({ x: 12, y: 100, width: 48, height: 40 }),
  )
  return row
}

describe('SidebarItem', () => {
  afterEach(() => {
    document.documentElement.dir = 'ltr'
  })

  it('names a collapsed row, with its count, beside it while the pointer is on it', async () => {
    const user = userEvent.setup()
    const row = renderItem(true)
    expect(tooltip()).toBeNull()

    await user.hover(row)
    expect(tooltip()).toHaveTextContent('QR code3')
    expect(tooltip()).toHaveStyle({ top: '120px', left: '74px' })

    await user.unhover(row)
    expect(tooltip()).toBeNull()
  })

  it('shows it on keyboard focus too, and drops it when the page scrolls', async () => {
    const user = userEvent.setup()
    renderItem(true)

    await user.tab()
    expect(tooltip()).toHaveTextContent('QR code')

    fireEvent.scroll(window)
    expect(tooltip()).toBeNull()

    await user.tab()
    expect(tooltip()).toBeNull()
  })

  it('sits on the left of the row in Arabic', async () => {
    document.documentElement.dir = 'rtl'
    const user = userEvent.setup()
    const row = renderItem(true)

    await user.hover(row)
    expect(tooltip()).toHaveStyle({ right: `${window.innerWidth - 12 + 14}px` })
  })

  it('needs none while the sidebar is open, since the name is written', async () => {
    const user = userEvent.setup()
    const row = renderItem(false)

    await user.hover(row)
    await user.tab()
    expect(tooltip()).toBeNull()
    expect(row).toHaveTextContent('QR code3')
  })
})
