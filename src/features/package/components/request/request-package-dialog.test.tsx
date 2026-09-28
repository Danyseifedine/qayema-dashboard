import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { makePackage } from '@/test/mocks/factories/packages'
import { renderWithProviders } from '@/test/utils/render-with-providers'
import { RequestPackageDialog } from '@/features/package/components/request/request-package-dialog'

let mock: MockAdapter

const PRO = makePackage({ id: 2, slug: 'pro', name: { en: 'Pro', ar: null } })

describe('RequestPackageDialog', () => {
  beforeEach(() => {
    mock = new MockAdapter(api)
    resetCsrfToken(api)
    installCsrfInterceptor(api)
    mock.onGet('/api/csrf-token').reply(200, { token: 'csrf' })
  })

  afterEach(() => {
    mock.restore()
    api.interceptors.request.clear()
    api.interceptors.response.clear()
    resetCsrfToken(api)
  })

  it('sends nothing while no package is picked', async () => {
    renderWithProviders(<RequestPackageDialog open pkg={null} locale="en" onClose={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Send request' })).toBeDisabled()
    fireEvent.submit(screen.getByRole('button', { name: 'Send request' }).closest('form')!)

    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(mock.history.post).toHaveLength(0)
  })

  it('closes on Escape, on the backdrop and on Cancel, but not on a click inside', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<RequestPackageDialog open pkg={PRO} locale="en" onClose={onClose} />)

    const dialog = screen.getByRole('dialog')
    fireEvent(dialog, new Event('cancel', { cancelable: true }))
    expect(onClose).toHaveBeenCalledTimes(1)

    await user.click(dialog)
    expect(onClose).toHaveBeenCalledTimes(2)

    await user.click(screen.getByText('Ask about Pro'))
    expect(onClose).toHaveBeenCalledTimes(2)

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledTimes(3)
  })

  it('stays open while the request is on its way', async () => {
    let answer: (value: [number, unknown]) => void = () => {}
    mock.onPost('/api/packages/request').reply(
      () =>
        new Promise((resolve) => {
          answer = resolve
        }),
    )
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<RequestPackageDialog open pkg={PRO} locale="en" onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: 'Send request' }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Send request' })).toHaveAttribute(
        'aria-busy',
        'true',
      ),
    )

    const dialog = screen.getByRole('dialog')
    fireEvent(dialog, new Event('cancel', { cancelable: true }))
    fireEvent.click(dialog)
    expect(onClose).not.toHaveBeenCalled()

    answer([201, { data: { id: 1, package: 'pro' } }])
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
  })

  it('opens and closes the native dialog with the prop, starting empty each time', async () => {
    const user = userEvent.setup()
    const { rerender } = renderWithProviders(
      <RequestPackageDialog open pkg={PRO} locale="en" onClose={vi.fn()} />,
    )

    const dialog = screen.getByRole('dialog') as HTMLDialogElement
    expect(dialog.open).toBe(true)
    await user.type(screen.getByLabelText(/Anything we should know/), 'A note')

    rerender(<RequestPackageDialog open={false} pkg={PRO} locale="en" onClose={vi.fn()} />)
    expect(dialog.open).toBe(false)

    rerender(<RequestPackageDialog open pkg={PRO} locale="en" onClose={vi.fn()} />)
    expect(dialog.open).toBe(true)
    await waitFor(() => expect(screen.getByLabelText(/Anything we should know/)).toHaveValue(''))
  })

  it('sends one request when Send is clicked twice in a row', async () => {
    mock.onPost('/api/packages/request').reply(201, { data: { id: 1, package: 'pro' } })
    renderWithProviders(<RequestPackageDialog open pkg={PRO} locale="en" onClose={vi.fn()} />)

    // A double click: both land before the button can re-render as busy.
    const send = screen.getByRole('button', { name: 'Send request' })
    fireEvent.click(send)
    fireEvent.click(send)

    await waitFor(() =>
      expect(mock.history.post.filter((r) => r.url === '/api/packages/request')).toHaveLength(1),
    )
  })
})
