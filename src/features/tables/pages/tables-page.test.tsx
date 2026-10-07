import { screen, waitFor, within } from '@testing-library/react'
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

function stub(tables = [table(1, 'Table 1'), table(2, 'Table 2')], meta = {}) {
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
    },
  })
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

    expect(await screen.findByRole('heading', { name: 'Table 2' })).toBeInTheDocument()
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
    renderWithProviders(<TablesPage onOpenFeatures={() => {}} />)

    expect(await screen.findByText('No tables yet')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Print all cards' })).not.toBeInTheDocument()
  })
})
