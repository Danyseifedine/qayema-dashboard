import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IconLock, IconQrcode } from '@tabler/icons-react'
import { describe, expect, it, vi } from 'vitest'
import { GoldNotice } from '@/shared/components/feedback/states/gold-notice'

describe('GoldNotice', () => {
  it('says what still works, with one way to change it and the state it is in', async () => {
    const onAction = vi.fn()
    const user = userEvent.setup()
    render(
      <GoldNotice
        icon={IconQrcode}
        badge={IconLock}
        title={
          <>
            <span className="text-accent">QR Studio</span> is off
          </>
        }
        description="Your QR code still works."
        action="Open Features"
        onAction={onAction}
        note="Simple mode active"
      />,
    )

    expect(screen.getByRole('region', { name: 'QR Studio is off' })).toBeInTheDocument()
    expect(screen.getByText('Your QR code still works.')).toBeInTheDocument()
    expect(screen.getByText('Simple mode active')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Open Features' }))
    expect(onAction).toHaveBeenCalledOnce()
  })
})
