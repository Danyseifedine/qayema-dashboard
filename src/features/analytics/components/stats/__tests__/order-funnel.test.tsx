import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { OrderFunnel } from '@/features/analytics/components/stats/order-funnel'

describe('OrderFunnel', () => {
  it('shows every step as a share of the visitors', () => {
    render(<OrderFunnel funnel={{ visitors: 50, carted: 10, ordered: 5, channel: 'menu' }} />)

    const funnel = screen.getByRole('list', { name: 'From visit to order' })
    expect(within(funnel).getByText('Opened the menu').closest('li')).toHaveTextContent('100%')
    expect(within(funnel).getByText('Placed an order').closest('li')).toHaveTextContent('10%')
  })

  it('shows 0% everywhere rather than dividing by no visitors', () => {
    render(<OrderFunnel funnel={{ visitors: 0, carted: 0, ordered: 0, channel: 'menu' }} />)

    const steps = within(screen.getByRole('list', { name: 'From visit to order' })).getAllByRole(
      'listitem',
    )
    for (const step of steps) expect(step).toHaveTextContent('0%')
  })

  it('says a WhatsApp order was only sent there', () => {
    render(<OrderFunnel funnel={{ visitors: 10, carted: 4, ordered: 2, channel: 'whatsapp' }} />)

    expect(screen.getByText('Sent their order to WhatsApp').closest('li')).toHaveTextContent('20%')
    expect(screen.queryByText('Placed an order')).not.toBeInTheDocument()
  })
})
