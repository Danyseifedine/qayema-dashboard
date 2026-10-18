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

  it('says the menu is live', () => {
    renderWithProviders(<MenuLinkCard publicUrl={MENU_URL} onOpenQr={vi.fn()} />)

    expect(within(card()).getByText('is live')).toBeInTheDocument()
    expect(within(card()).getByText('Your customers can view your menu now.')).toBeInTheDocument()
  })

  it('says the link is copied where there is no share menu, and when the browser refuses', async () => {
    const user = userEvent.setup()
    // user-event puts its own clipboard on navigator; spy on that one.
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    renderWithProviders(<MenuLinkCard publicUrl={MENU_URL} onOpenQr={vi.fn()} />)

    await user.click(within(card()).getByRole('button', { name: 'Share my menu' }))
    expect(writeText).toHaveBeenCalledWith(MENU_URL)
    expect(await screen.findByText('Link copied')).toBeInTheDocument()

    writeText.mockRejectedValue(new Error('denied'))
    await user.click(within(card()).getByRole('button', { name: 'Share my menu' }))
    expect(await screen.findByText('Could not copy the link')).toBeInTheDocument()
  })

  it('previews the menu in a new tab, cut off from the dashboard', async () => {
    const user = userEvent.setup()
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    renderWithProviders(<MenuLinkCard publicUrl={MENU_URL} onOpenQr={vi.fn()} />)

    await user.click(within(card()).getByRole('button', { name: 'Preview' }))

    expect(open).toHaveBeenCalledWith(MENU_URL, '_blank', 'noopener,noreferrer')
  })

  it("shares the link through the phone's share menu", async () => {
    const user = userEvent.setup()
    const share = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', { value: share, configurable: true })
    renderWithProviders(<MenuLinkCard publicUrl={MENU_URL} onOpenQr={vi.fn()} />)

    await user.click(within(card()).getByRole('button', { name: 'Share my menu' }))

    expect(share).toHaveBeenCalledWith({ title: 'Our menu', url: MENU_URL })
    Reflect.deleteProperty(navigator, 'share')
  })

  it('copies the link where there is no share menu, and stays quiet when the owner closes it', async () => {
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    renderWithProviders(<MenuLinkCard publicUrl={MENU_URL} onOpenQr={vi.fn()} />)

    await user.click(within(card()).getByRole('button', { name: 'Share my menu' }))
    expect(writeText).toHaveBeenCalledWith(MENU_URL)

    writeText.mockClear()
    const closed = Object.assign(new Error('closed'), { name: 'AbortError' })
    Object.defineProperty(navigator, 'share', {
      value: vi.fn().mockRejectedValue(closed),
      configurable: true,
    })
    await user.click(within(card()).getByRole('button', { name: 'Share my menu' }))
    expect(writeText).not.toHaveBeenCalled()

    Object.defineProperty(navigator, 'share', {
      value: vi.fn().mockRejectedValue(new Error('refused')),
      configurable: true,
    })
    await user.click(within(card()).getByRole('button', { name: 'Share my menu' }))
    expect(writeText).toHaveBeenCalledWith(MENU_URL)
    Reflect.deleteProperty(navigator, 'share')
  })

  it('takes the owner to the QR code', async () => {
    const user = userEvent.setup()
    const onOpenQr = vi.fn()
    renderWithProviders(<MenuLinkCard publicUrl={MENU_URL} onOpenQr={onOpenQr} />)

    await user.click(within(card()).getByRole('button', { name: 'QR code' }))

    expect(onOpenQr).toHaveBeenCalledTimes(1)
  })
})
