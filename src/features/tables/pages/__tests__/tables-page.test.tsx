import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { renderWithProviders } from '@/test/render-with-providers'
import { TablesPage } from '@/features/tables/pages/tables-page'

/**
 * The drawing library needs a real canvas, which jsdom does not have. The
 * fake records what it was asked to draw and download: the options going in,
 * not the pixels coming out.
 */
const drawn = vi.hoisted(() => ({
  created: [] as Record<string, unknown>[],
  downloads: [] as { name: string; extension: string; data: unknown }[],
}))

vi.mock('qr-code-styling', () => ({
  default: class {
    options: Record<string, unknown>
    constructor(options: Record<string, unknown>) {
      this.options = options
      drawn.created.push(options)
    }
    append() {}
    async download({ name, extension }: { name: string; extension: string }) {
      drawn.downloads.push({ name, extension, data: this.options.data })
    }
  },
}))

let mock: MockAdapter

const DESIGN = {
  dot_style: 'rounded',
  dot_color: '#1F6FEB',
  dot_gradient: null,
  gradient_type: 'linear',
  corner_style: 'square',
  corner_color: '#000000',
  eye_style: 'square',
  eye_color: '#000000',
  background: '#FFFFFF',
  logo: false,
  logo_size: 'medium',
  card_theme: 'light',
  title: 'Olive',
  subtitle: null,
  cta: null,
  show_url: true,
}

function table(id: number, name: string) {
  return { id, name, code: `code${id}`, url: `http://localhost:8000/olive?table=code${id}&qr=1` }
}

function stub(tables = [table(1, 'Table 1'), table(2, 'Table 2')], meta = {}, qr = {}) {
  mock
    .onGet('/api/tables')
    .reply(200, { data: tables, meta: { limit: 300, takes_orders: true, ...meta } })
  mock.onGet('/api/qr').reply(200, {
    data: {
      unlocked: true,
      switched_off: false,
      url: 'http://localhost:8000/olive?qr=1',
      display_url: 'localhost/olive',
      card_url: null,
      logo_data_url: null,
      brand_color: '#1F6FEB',
      settings: DESIGN,
      defaults: { ...DESIGN, dot_style: 'square', dot_color: '#000000' },
      stats: null,
      ...qr,
    },
  })
}

/** The print sheet goes straight into the page body; null while nothing prints. */
function printSheet(): HTMLElement | null {
  return document.body.querySelector<HTMLElement>('.qy-print-sheet')
}

/** A card on the page, found by the table's name. */
async function findCard(name: string): Promise<HTMLElement> {
  return (await screen.findByRole('heading', { name })).closest('article')!
}

describe('TablesPage', () => {
  beforeEach(() => {
    drawn.created.length = 0
    drawn.downloads.length = 0
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

  it('draws each table its own code, in the QR page design', async () => {
    stub()
    renderWithProviders(<TablesPage onOpenFeatures={() => {}} />)

    // The file's first wait also loads the page's code, slow under a full run.
    expect(
      await screen.findByRole('heading', { name: 'Table 2' }, { timeout: 4000 }),
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(drawn.created).toContainEqual(
        expect.objectContaining({
          data: 'http://localhost:8000/olive?table=code2&qr=1',
          dotsOptions: expect.objectContaining({ type: 'rounded', color: '#1F6FEB' }),
        }),
      ),
    )
  })

  it('adds a numbered run that carries on from the last table', async () => {
    stub()
    mock.onPost('/api/tables').reply(201, { data: [table(3, 'Table 3'), table(4, 'Table 4')] })
    const user = userEvent.setup()
    renderWithProviders(<TablesPage onOpenFeatures={() => {}} />)

    await user.click(await screen.findByRole('button', { name: 'Add tables' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByLabelText('Name')).toHaveValue('Table')
    expect(within(dialog).getByLabelText('From')).toHaveValue('3')
    const to = within(dialog).getByLabelText('To')
    await user.clear(to)
    await user.type(to, '4')
    expect(within(dialog).getByText('Adds 2 tables, Table 3 to Table 4.')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Add 2 tables' }))

    await waitFor(() => expect(mock.history.post).toHaveLength(1))
    expect(JSON.parse(mock.history.post[0]!.data as string)).toEqual({
      names: ['Table 3', 'Table 4'],
    })
  })

  it('refuses a run that ends before it starts', async () => {
    stub()
    const user = userEvent.setup()
    renderWithProviders(<TablesPage onOpenFeatures={() => {}} />)

    await user.click(await screen.findByRole('button', { name: 'Add tables' }))
    const dialog = screen.getByRole('dialog')
    const to = within(dialog).getByLabelText('To')
    await user.clear(to)
    await user.type(to, '1')
    await user.click(within(dialog).getByRole('button', { name: 'Add table' }))

    expect(
      await within(dialog).findByText(
        'Check the numbers: "To" has to be the same as "From" or higher.',
      ),
    ).toBeInTheDocument()
    expect(mock.history.post).toHaveLength(0)
  })

  it('adds one table by name and shows the server saying it is taken', async () => {
    stub()
    mock.onPost('/api/tables').reply(422, {
      message: 'The given data was invalid.',
      errors: { 'names.0': ['You already have a table with this name.'] },
    })
    const user = userEvent.setup()
    renderWithProviders(<TablesPage onOpenFeatures={() => {}} />)

    await user.click(await screen.findByRole('button', { name: 'Add tables' }))
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('tab', { name: 'One by name' }))
    await user.type(within(dialog).getByLabelText(/Table name/), 'Terrace')
    await user.click(within(dialog).getByRole('button', { name: 'Add table' }))

    expect(
      await within(dialog).findByText('You already have a table with this name.'),
    ).toBeInTheDocument()
    expect(JSON.parse(mock.history.post[0]!.data as string)).toEqual({ names: ['Terrace'] })
  })

  it('downloads a table code with the table link in it', async () => {
    stub()
    const user = userEvent.setup()
    renderWithProviders(<TablesPage onOpenFeatures={() => {}} />)

    const card = (await screen.findByRole('heading', { name: 'Table 1' })).closest('article')!
    await user.click(within(card).getByRole('button', { name: 'Download QR code' }))

    await waitFor(() =>
      expect(drawn.downloads).toEqual([
        {
          name: 'qr-table-1',
          extension: 'png',
          data: 'http://localhost:8000/olive?table=code1&qr=1',
        },
      ]),
    )
  })

  it('opens the menu at a table, not counted as a scan', async () => {
    stub()
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    const user = userEvent.setup()
    renderWithProviders(<TablesPage onOpenFeatures={() => {}} />)

    const card = (await screen.findByRole('heading', { name: 'Table 2' })).closest('article')!
    await user.click(within(card).getByRole('button', { name: 'Open the menu at this table' }))

    expect(open).toHaveBeenCalledWith(
      'http://localhost:8000/olive?table=code2',
      '_blank',
      'noopener,noreferrer',
    )
    open.mockRestore()
  })

  it('asks before giving a table a new code', async () => {
    stub()
    mock
      .onPost('/api/tables/1/new-code')
      .reply(200, { data: { ...table(1, 'Table 1'), code: 'fresh' } })
    const user = userEvent.setup()
    renderWithProviders(<TablesPage onOpenFeatures={() => {}} />)

    const card = (await screen.findByRole('heading', { name: 'Table 1' })).closest('article')!
    await user.click(within(card).getByRole('button', { name: 'New code' }))
    expect(
      screen.getByText(/The card on this table stops working straight away/),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Make a new code' }))

    await waitFor(() => expect(mock.history.post).toHaveLength(1))
    expect(await screen.findByText('Table 1 has a new code')).toBeInTheDocument()
  })

  it('says when ordering at the table is switched off', async () => {
    stub(undefined, { takes_orders: false })
    const onOpenFeatures = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<TablesPage onOpenFeatures={onOpenFeatures} />)

    expect(await screen.findByText('Ordering at the table is switched off')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Open Features' }))
    expect(onOpenFeatures).toHaveBeenCalledOnce()
  })

  it('starts from an empty room', async () => {
    stub([])
    const user = userEvent.setup()
    renderWithProviders(<TablesPage onOpenFeatures={() => {}} />)

    expect(await screen.findByText('No tables yet')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Print all cards' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Add your tables' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Add tables' })).toBeInTheDocument()
    await waitFor(() => expect(within(dialog).getByLabelText('From')).toHaveValue('1'))
  })

  it('stops adding at the limit and says why', async () => {
    stub(undefined, { limit: 2 })
    renderWithProviders(<TablesPage onOpenFeatures={() => {}} />)

    expect(
      await screen.findByText('You have 2 tables, the most a restaurant can have.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add tables' })).toBeDisabled()
  })

  it('says when the tables cannot load, and tries again', async () => {
    mock.onGet('/api/tables').replyOnce(500, { message: 'Server down', code: 'server_error' })
    stub()
    const user = userEvent.setup()
    renderWithProviders(<TablesPage onOpenFeatures={() => {}} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Server down')
    expect(screen.getByRole('button', { name: 'Add tables' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('heading', { name: 'Table 1' })).toBeInTheDocument()
  })

  it('renames a table and closes the dialog', async () => {
    stub()
    mock.onPatch('/api/tables/1').reply(200, { data: table(1, 'Window') })
    const user = userEvent.setup()
    renderWithProviders(<TablesPage onOpenFeatures={() => {}} />)

    await user.click(within(await findCard('Table 1')).getByRole('button', { name: 'Rename' }))
    const dialog = screen.getByRole('dialog')
    const name = within(dialog).getByLabelText(/Table name/)
    await waitFor(() => expect(name).toHaveValue('Table 1'))
    await user.clear(name)
    await user.type(name, 'Window')
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Table renamed')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(mock.history.patch[0]!.url).toBe('/api/tables/1')
    expect(JSON.parse(mock.history.patch[0]!.data as string)).toEqual({ name: 'Window' })
  })

  it('removes a table once the owner confirms', async () => {
    stub()
    mock.onDelete('/api/tables/2').reply(204)
    const user = userEvent.setup()
    renderWithProviders(<TablesPage onOpenFeatures={() => {}} />)

    await user.click(within(await findCard('Table 2')).getByRole('button', { name: 'Remove' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Remove Table 2?' })).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Remove table' }))

    expect(await screen.findByText('Table removed')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(mock.history.delete.map((request) => request.url)).toEqual(['/api/tables/2'])
  })

  it('keeps the table and says so when removing it fails', async () => {
    stub()
    mock.onDelete('/api/tables/2').reply(500, { message: 'Server down', code: 'server_error' })
    const user = userEvent.setup()
    renderWithProviders(<TablesPage onOpenFeatures={() => {}} />)

    await user.click(within(await findCard('Table 2')).getByRole('button', { name: 'Remove' }))
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Remove table' }),
    )

    expect(await screen.findByText('Could not remove that table')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Table 2' })).toBeInTheDocument()
  })

  it('sends nothing when a removal or a new code is cancelled', async () => {
    stub()
    const user = userEvent.setup()
    renderWithProviders(<TablesPage onOpenFeatures={() => {}} />)

    await user.click(within(await findCard('Table 1')).getByRole('button', { name: 'Remove' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    await user.click(within(await findCard('Table 1')).getByRole('button', { name: 'New code' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    expect(mock.history.delete).toHaveLength(0)
    expect(mock.history.post).toHaveLength(0)
  })

  it('says when a new code could not be made', async () => {
    stub()
    mock.onPost('/api/tables/1/new-code').reply(500, { message: 'Server down', code: 'x' })
    const user = userEvent.setup()
    renderWithProviders(<TablesPage onOpenFeatures={() => {}} />)

    await user.click(within(await findCard('Table 1')).getByRole('button', { name: 'New code' }))
    await user.click(screen.getByRole('button', { name: 'Make a new code' }))

    expect(await screen.findByText('Could not make a new code')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('names a download after the table in any script, or "table" when nothing is left', async () => {
    stub([table(1, 'طاولة 1'), table(2, '★')])
    const user = userEvent.setup()
    renderWithProviders(<TablesPage onOpenFeatures={() => {}} />)

    await user.click(
      within(await findCard('طاولة 1')).getByRole('button', { name: 'Download QR code' }),
    )
    await user.click(within(await findCard('★')).getByRole('button', { name: 'Download QR code' }))

    await waitFor(() =>
      expect(drawn.downloads.map((download) => download.name)).toEqual(['qr-طاولة-1', 'qr-table']),
    )
  })

  it('prints every card with the design heading, then lets go of the sheet', async () => {
    stub()
    const print = vi.spyOn(window, 'print').mockImplementation(() => {})
    renderWithProviders(<TablesPage onOpenFeatures={() => {}} />)

    await screen.findByRole('heading', { name: 'Table 2' })
    // Print only once the QR page's design has arrived.
    await waitFor(() =>
      expect(drawn.created).toContainEqual(
        expect.objectContaining({ dotsOptions: expect.objectContaining({ type: 'rounded' }) }),
      ),
    )
    vi.useFakeTimers()
    try {
      fireEvent.click(screen.getByRole('button', { name: 'Print all cards' }))

      const sheet = printSheet()!
      expect(within(sheet).getAllByText('Olive')).toHaveLength(2)
      expect(within(sheet).getByText('Table 1')).toBeInTheDocument()
      expect(within(sheet).getByText('Table 2')).toBeInTheDocument()
      expect(within(sheet).getAllByText('Scan to see the menu and order')).toHaveLength(2)

      // A moment for the codes to draw before the print dialog opens.
      act(() => vi.advanceTimersByTime(149))
      expect(print).not.toHaveBeenCalled()
      act(() => vi.advanceTimersByTime(1))
      expect(print).toHaveBeenCalledOnce()
    } finally {
      vi.useRealTimers()
    }

    act(() => {
      window.dispatchEvent(new Event('afterprint'))
    })
    expect(printSheet()).toBeNull()
    print.mockRestore()
  })

  it('prints one card, and prints it again on a second click', async () => {
    stub(undefined, { takes_orders: false })
    const print = vi.spyOn(window, 'print').mockImplementation(() => {})
    const user = userEvent.setup()
    renderWithProviders(<TablesPage onOpenFeatures={() => {}} />)

    const second = await findCard('Table 2')
    await user.click(within(second).getByRole('button', { name: 'Print card' }))

    const sheet = printSheet()!
    expect(within(sheet).getByText('Table 2')).toBeInTheDocument()
    expect(within(sheet).queryByText('Table 1')).not.toBeInTheDocument()
    expect(within(sheet).getByText('Scan to see the menu')).toBeInTheDocument()
    await waitFor(() => expect(print).toHaveBeenCalledOnce())

    await user.click(within(second).getByRole('button', { name: 'Print card' }))
    await waitFor(() => expect(print).toHaveBeenCalledTimes(2))
    print.mockRestore()
  })

  it('waits longer before printing a design with a logo', async () => {
    stub(
      undefined,
      {},
      {
        logo_data_url: 'data:image/png;base64,AAAA',
        settings: { ...DESIGN, logo: true },
      },
    )
    const print = vi.spyOn(window, 'print').mockImplementation(() => {})
    renderWithProviders(<TablesPage onOpenFeatures={() => {}} />)

    await screen.findByRole('heading', { name: 'Table 1' })
    await waitFor(() =>
      expect(drawn.created).toContainEqual(
        expect.objectContaining({ image: 'data:image/png;base64,AAAA' }),
      ),
    )
    vi.useFakeTimers()
    try {
      fireEvent.click(screen.getByRole('button', { name: 'Print all cards' }))
      act(() => vi.advanceTimersByTime(699))
      expect(print).not.toHaveBeenCalled()
      act(() => vi.advanceTimersByTime(1))
      expect(print).toHaveBeenCalledOnce()
    } finally {
      vi.useRealTimers()
    }
    print.mockRestore()
  })

  it('draws the plain design, with no heading on paper, when the QR studio is locked', async () => {
    stub(undefined, {}, { unlocked: false, logo_data_url: 'data:image/png;base64,AAAA' })
    const print = vi.spyOn(window, 'print').mockImplementation(() => {})
    const user = userEvent.setup()
    renderWithProviders(<TablesPage onOpenFeatures={() => {}} />)

    await screen.findByRole('heading', { name: 'Table 1' })
    await waitFor(() =>
      expect(drawn.created).toContainEqual(
        expect.objectContaining({
          data: 'http://localhost:8000/olive?table=code1&qr=1',
          dotsOptions: expect.objectContaining({ type: 'square', color: '#000000' }),
        }),
      ),
    )
    expect(drawn.created).not.toContainEqual(expect.objectContaining({ image: expect.anything() }))

    await user.click(screen.getByRole('button', { name: 'Print all cards' }))
    expect(within(printSheet()!).queryByText('Olive')).not.toBeInTheDocument()
    await waitFor(() => expect(print).toHaveBeenCalledOnce())
    print.mockRestore()
  })
})
