import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { renderWithProviders } from '@/test/render-with-providers'
import { AddTablesDialog } from '@/features/tables/components/form/add-tables-dialog'

let mock: MockAdapter

function table(id: number, name: string) {
  return { id, name, code: `code${id}`, url: `http://localhost:8000/olive?table=code${id}&qr=1` }
}

describe('AddTablesDialog', () => {
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

  it('starts a first room at Table 1 to Table 10', async () => {
    renderWithProviders(<AddTablesDialog open existing={[]} onClose={vi.fn()} />)

    const dialog = screen.getByRole('dialog')
    await waitFor(() => expect(within(dialog).getByLabelText('Name')).toHaveValue('Table'))
    expect(within(dialog).getByLabelText('From')).toHaveValue('1')
    expect(within(dialog).getByLabelText('To')).toHaveValue('10')
    expect(within(dialog).getByText('Adds 10 tables, Table 1 to Table 10.')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Add 10 tables' })).toBeInTheDocument()
  })

  it('names a run of one by itself, and says when the numbers make no run', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddTablesDialog open existing={['Patio 4']} onClose={vi.fn()} />)

    const dialog = screen.getByRole('dialog')
    await waitFor(() => expect(within(dialog).getByLabelText('Name')).toHaveValue('Patio'))
    const to = within(dialog).getByLabelText('To')
    await user.clear(to)
    await user.type(to, '5')
    expect(within(dialog).getByText('Adds Patio 5.')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Add table' })).toBeInTheDocument()

    await user.clear(to)
    expect(within(dialog).getByText('Pick where the numbers start and end.')).toBeInTheDocument()
  })

  it('shows a failure that names no field above the form', async () => {
    mock.onPost('/api/tables').reply(500, { message: 'Server down', code: 'server_error' })
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<AddTablesDialog open existing={[]} onClose={onClose} />)

    const dialog = screen.getByRole('dialog')
    await waitFor(() => expect(within(dialog).getByLabelText('Name')).toHaveValue('Table'))
    await user.click(within(dialog).getByRole('button', { name: 'Add 10 tables' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Server down')
    expect(onClose).not.toHaveBeenCalled()

    // Switching how to add them starts clean.
    await user.click(within(dialog).getByRole('tab', { name: 'One by name' }))
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument()
  })

  it('closes on Escape, on the backdrop and on Cancel, but not on a click inside', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<AddTablesDialog open existing={[]} onClose={onClose} />)

    const dialog = screen.getByRole('dialog')
    fireEvent(dialog, new Event('cancel', { cancelable: true }))
    expect(onClose).toHaveBeenCalledTimes(1)

    await user.click(dialog)
    expect(onClose).toHaveBeenCalledTimes(2)

    await user.click(within(dialog).getByText('Add tables'))
    expect(onClose).toHaveBeenCalledTimes(2)

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledTimes(3)
  })

  it('stays open while the tables are being added, then closes', async () => {
    let answer: (value: [number, unknown]) => void = () => {}
    mock.onPost('/api/tables').reply(
      () =>
        new Promise((resolve) => {
          answer = resolve
        }),
    )
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<AddTablesDialog open existing={[]} onClose={onClose} />)

    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('tab', { name: 'One by name' }))
    await user.type(within(dialog).getByLabelText(/Table name/), 'Bar')
    await user.click(within(dialog).getByRole('button', { name: 'Add table' }))
    await waitFor(() =>
      expect(within(dialog).getByRole('button', { name: 'Add table' })).toHaveAttribute(
        'aria-busy',
        'true',
      ),
    )

    fireEvent(dialog, new Event('cancel', { cancelable: true }))
    fireEvent.click(dialog)
    expect(onClose).not.toHaveBeenCalled()

    answer([201, { data: [table(1, 'Bar')] }])
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
    expect(await screen.findByText('Table added')).toBeInTheDocument()
  })

  it('closes when the page closes it', () => {
    const { rerender } = renderWithProviders(
      <AddTablesDialog open existing={[]} onClose={vi.fn()} />,
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    rerender(<AddTablesDialog open={false} existing={[]} onClose={vi.fn()} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
