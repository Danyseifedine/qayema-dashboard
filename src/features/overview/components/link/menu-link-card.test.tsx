import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/render-with-providers'
import { MenuLinkCard } from '@/features/overview/components/link/menu-link-card'

const MENU_URL = 'https://qayema.test/cedar-and-salt'

const card = () => screen.getByRole('region', { name: 'Your menu link' })

describe('MenuLinkCard', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows the link without its scheme, pointing at the menu in a new tab', () => {
    renderWithProviders(<MenuLinkCard publicUrl={MENU_URL} onOpenQr={vi.fn()} />)

    const link = within(card()).getByRole('link', { name: 'qayema.test/cedar-and-salt' })
    expect(link).toHaveAttribute('href', MENU_URL)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noreferrer noopener')
  })

  it('copies the full link and says so', async () => {
    const user = userEvent.setup()
    // user-event puts its own clipboard on navigator; spy on that one.
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    renderWithProviders(<MenuLinkCard publicUrl={MENU_URL} onOpenQr={vi.fn()} />)

    await user.click(within(card()).getByRole('button', { name: 'Copy link' }))

    expect(writeText).toHaveBeenCalledWith(MENU_URL)
    expect(await screen.findByText('Link copied')).toBeInTheDocument()
  })

  it('says so when the browser refuses the copy', async () => {
    const user = userEvent.setup()
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'))
    renderWithProviders(<MenuLinkCard publicUrl={MENU_URL} onOpenQr={vi.fn()} />)

    await user.click(within(card()).getByRole('button', { name: 'Copy link' }))

    expect(await screen.findByText('Could not copy the link')).toBeInTheDocument()
  })

  it('opens the menu in a new tab, cut off from the dashboard', async () => {
    const user = userEvent.setup()
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    renderWithProviders(<MenuLinkCard publicUrl={MENU_URL} onOpenQr={vi.fn()} />)

    await user.click(within(card()).getByRole('button', { name: 'Open menu' }))

    expect(open).toHaveBeenCalledWith(MENU_URL, '_blank', 'noopener,noreferrer')
  })

  it('takes the owner to the QR code', async () => {
    const user = userEvent.setup()
    const onOpenQr = vi.fn()
    renderWithProviders(<MenuLinkCard publicUrl={MENU_URL} onOpenQr={onOpenQr} />)

    await user.click(within(card()).getByRole('button', { name: 'QR code' }))

    expect(onOpenQr).toHaveBeenCalledTimes(1)
  })
})
