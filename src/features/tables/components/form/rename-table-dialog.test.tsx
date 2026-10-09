import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { renderWithProviders } from '@/test/render-with-providers'
import { RenameTableDialog } from '@/features/tables/components/form/rename-table-dialog'

let mock: MockAdapter

const TABLE = {
  id: 7,
  name: 'Table 7',
  code: 'code7',
  url: 'http://localhost:8000/olive?table=code7&qr=1',
}

describe('RenameTableDialog', () => {
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

  it('opens on the table name and sends the new one', async () => {
    mock.onPatch('/api/tables/7').reply(200, { data: { ...TABLE, name: 'Window' } })
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<RenameTableDialog table={TABLE} onClose={onClose} />)

    const dialog = screen.getByRole('dialog')
    const name = within(dialog).getByLabelText(/Table name/)
    await waitFor(() => expect(name).toHaveValue('Table 7'))
    await user.clear(name)
    await user.type(name, '  Window ')
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
    expect(JSON.parse(mock.history.patch[0]!.data as string)).toEqual({ name: 'Window' })
    expect(await screen.findByText('Table renamed')).toBeInTheDocument()
  })

  it('asks for a name before sending anything', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RenameTableDialog table={TABLE} onClose={vi.fn()} />)

    const name = screen.getByLabelText(/Table name/)
    await waitFor(() => expect(name).toHaveValue('Table 7'))
    await user.clear(name)
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Give the table a name.')).toBeInTheDocument()
    expect(mock.history.patch).toHaveLength(0)
  })

  it('puts a name the server refuses under the field and stays open', async () => {
    mock.onPatch('/api/tables/7').reply(422, {
      message: 'The given data was invalid.',
      errors: { name: ['You already have a table with this name.'] },
    })
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<RenameTableDialog table={TABLE} onClose={onClose} />)

    await waitFor(() => expect(screen.getByLabelText(/Table name/)).toHaveValue('Table 7'))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('You already have a table with this name.')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('shows any other failure above the form', async () => {
    mock.onPatch('/api/tables/7').reply(500, { message: 'Server down', code: 'server_error' })
    const user = userEvent.setup()
    renderWithProviders(<RenameTableDialog table={TABLE} onClose={vi.fn()} />)

    await waitFor(() => expect(screen.getByLabelText(/Table name/)).toHaveValue('Table 7'))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Server down')
  })

  it('closes on Escape, on the backdrop and on Cancel, but not on a click inside', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<RenameTableDialog table={TABLE} onClose={onClose} />)

    const dialog = screen.getByRole('dialog')
    fireEvent(dialog, new Event('cancel', { cancelable: true }))
    expect(onClose).toHaveBeenCalledTimes(1)

    await user.click(dialog)
    expect(onClose).toHaveBeenCalledTimes(2)

    await user.click(within(dialog).getByText('Rename table'))
    expect(onClose).toHaveBeenCalledTimes(2)

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledTimes(3)
  })

  it('stays open while the new name is saving', async () => {
    let answer: (value: [number, unknown]) => void = () => {}
    mock.onPatch('/api/tables/7').reply(
      () =>
        new Promise((resolve) => {
          answer = resolve
        }),
    )
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<RenameTableDialog table={TABLE} onClose={onClose} />)

    await waitFor(() => expect(screen.getByLabelText(/Table name/)).toHaveValue('Table 7'))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('aria-busy', 'true'),
    )

    const dialog = screen.getByRole('dialog')
    fireEvent(dialog, new Event('cancel', { cancelable: true }))
    fireEvent.click(dialog)
    expect(onClose).not.toHaveBeenCalled()

    answer([200, { data: TABLE }])
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
  })

  it('sends nothing once the table is let go, and still saves when it opens again', async () => {
    mock.onPatch('/api/tables/7').reply(200, { data: TABLE })
    const onClose = vi.fn()
    const user = userEvent.setup()
    const { rerender } = renderWithProviders(<RenameTableDialog table={TABLE} onClose={onClose} />)
    await waitFor(() => expect(screen.getByLabelText(/Table name/)).toHaveValue('Table 7'))

    rerender(<RenameTableDialog table={null} onClose={onClose} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    // A submit that reaches the closed dialog has no table to rename.
    const form = screen.getByRole('button', { name: 'Save', hidden: true }).closest('form')!
    await act(async () => {
      fireEvent.submit(form)
    })

    rerender(<RenameTableDialog table={TABLE} onClose={onClose} />)
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
    expect(mock.history.patch).toHaveLength(1)
  })
})
