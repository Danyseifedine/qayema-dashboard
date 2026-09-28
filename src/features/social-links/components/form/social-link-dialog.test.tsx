import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { renderWithProviders } from '@/test/utils/render-with-providers'
import { SocialLinkDialog } from '@/features/social-links/components/form/social-link-dialog'

let mock: MockAdapter

const INSTAGRAM = { id: 1, platform: 'instagram' as const, url: 'https://instagram.com/beit' }

describe('SocialLinkDialog', () => {
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

  it('starts on Instagram when every platform is already taken', () => {
    renderWithProviders(
      <SocialLinkDialog
        open
        link={null}
        taken={['instagram', 'x', 'facebook', 'tiktok']}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByLabelText(/^Link/)).toHaveAttribute(
      'placeholder',
      'https://instagram.com/your-restaurant',
    )
  })

  it('starts on the first free platform, with its placeholder', () => {
    renderWithProviders(
      <SocialLinkDialog open link={null} taken={['instagram']} onClose={vi.fn()} />,
    )

    expect(screen.getByRole('combobox', { name: /Platform/ })).toHaveValue('X')
    expect(screen.getByLabelText(/^Link/)).toHaveAttribute(
      'placeholder',
      'https://x.com/your-restaurant',
    )
  })

  it('closes on Escape, on the backdrop and on Cancel, but not on a click inside', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<SocialLinkDialog open link={null} taken={[]} onClose={onClose} />)

    const dialog = screen.getByRole('dialog')
    fireEvent(dialog, new Event('cancel', { cancelable: true }))
    expect(onClose).toHaveBeenCalledTimes(1)

    await user.click(dialog)
    expect(onClose).toHaveBeenCalledTimes(2)

    await user.click(screen.getByText('Add a social link'))
    expect(onClose).toHaveBeenCalledTimes(2)

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledTimes(3)
  })

  it('stays open while saving, then closes', async () => {
    let answer: (value: [number, unknown]) => void = () => {}
    mock.onPatch('/api/social-links/1').reply(
      () =>
        new Promise((resolve) => {
          answer = resolve
        }),
    )
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(
      <SocialLinkDialog open link={INSTAGRAM} taken={['instagram']} onClose={onClose} />,
    )

    await user.click(screen.getByRole('button', { name: 'Save link' }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Save link' })).toHaveAttribute(
        'aria-busy',
        'true',
      ),
    )

    const dialog = screen.getByRole('dialog')
    fireEvent(dialog, new Event('cancel', { cancelable: true }))
    fireEvent.click(dialog)
    expect(onClose).not.toHaveBeenCalled()

    answer([200, { data: INSTAGRAM }])
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
    expect(await screen.findByText('Link saved')).toBeInTheDocument()
  })

  it('puts a rejected link under its field and keeps the dialog open', async () => {
    mock.onPatch('/api/social-links/1').reply(422, {
      message: 'The given data was invalid.',
      code: 'validation_failed',
      errors: { url: ['That address does not look like Instagram.'] },
    })
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(
      <SocialLinkDialog open link={INSTAGRAM} taken={['instagram']} onClose={onClose} />,
    )

    await user.click(screen.getByRole('button', { name: 'Save link' }))

    expect(
      await screen.findByText('That address does not look like Instagram.'),
    ).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
    expect(await screen.findByText('Could not save that link')).toBeInTheDocument()
  })

  it('shows any other failure above the form', async () => {
    mock.onPost('/api/social-links').reply(500, { message: 'Server down', code: 'server_error' })
    const user = userEvent.setup()
    renderWithProviders(<SocialLinkDialog open link={null} taken={[]} onClose={vi.fn()} />)

    await user.type(screen.getByLabelText(/^Link/), 'https://instagram.com/beit')
    await user.click(screen.getByRole('button', { name: 'Add link' }))

    const dialog = screen.getByRole('dialog')
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Server down')
    expect(await screen.findByText('Could not add that link')).toBeInTheDocument()
  })

  it('opens and closes the native dialog with the prop, starting clean each time', async () => {
    const user = userEvent.setup()
    const { rerender } = renderWithProviders(
      <SocialLinkDialog open link={null} taken={[]} onClose={vi.fn()} />,
    )

    const dialog = screen.getByRole('dialog') as HTMLDialogElement
    expect(dialog.open).toBe(true)
    await user.type(screen.getByLabelText(/^Link/), 'https://left.over')

    rerender(<SocialLinkDialog open={false} link={null} taken={[]} onClose={vi.fn()} />)
    expect(dialog.open).toBe(false)

    rerender(<SocialLinkDialog open link={null} taken={[]} onClose={vi.fn()} />)
    expect(dialog.open).toBe(true)
    await waitFor(() => expect(screen.getByLabelText(/^Link/)).toHaveValue(''))
  })

  it('adds one link when Add is clicked twice in a row', async () => {
    mock.onPost('/api/social-links').reply(201, { data: INSTAGRAM })
    const user = userEvent.setup()
    renderWithProviders(<SocialLinkDialog open link={null} taken={[]} onClose={vi.fn()} />)

    await user.type(screen.getByLabelText(/^Link/), 'https://instagram.com/beit')

    // A double click: both land before the button can re-render as busy.
    const add = screen.getByRole('button', { name: 'Add link' })
    fireEvent.click(add)
    fireEvent.click(add)

    await waitFor(() =>
      expect(mock.history.post.filter((r) => r.url === '/api/social-links')).toHaveLength(1),
    )
  })
})
