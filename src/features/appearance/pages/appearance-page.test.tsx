import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { renderWithProviders } from '@/test/utils/render-with-providers'
import { AppearancePage } from '@/features/appearance/pages/appearance-page'

let mock: MockAdapter

const LATIN = {
  script: 'latin',
  languages: ['en'],
  value: 'Inter',
  default: 'Inter',
  sample: 'Grilled halloumi · 12.50',
  options: [
    { family: 'Inter', category: 'sans' },
    { family: 'Poppins', category: 'sans' },
    { family: 'Lora', category: 'serif' },
  ],
}

const ARABIC = {
  script: 'arabic',
  languages: ['ar'],
  value: 'El Messiri',
  default: 'El Messiri',
  sample: 'حلوم مشوي بالزعتر',
  options: [
    { family: 'El Messiri', category: 'display' },
    { family: 'Cairo', category: 'sans' },
  ],
}

const CLASSIC_SETTINGS = [
  {
    key: 'primary_color',
    type: 'color',
    label: { en: 'Main colour', ar: 'اللون الرئيسي' },
    default: '#F8D38D',
    value: '#F8D38D',
    contrast_with: null,
    options: [] as string[],
  },
  {
    key: 'background_color',
    type: 'color',
    label: { en: 'Background', ar: 'الخلفية' },
    default: '#FFFFFF',
    value: '#FFFFFF',
    contrast_with: null,
    options: [] as string[],
  },
  {
    key: 'text_color',
    type: 'color',
    label: { en: 'Text', ar: 'النص' },
    default: '#111418',
    value: '#111418',
    contrast_with: 'background_color',
    options: [] as string[],
  },
  {
    key: 'show_name',
    type: 'boolean',
    label: { en: 'Name in the top bar', ar: 'الاسم في الشريط العلوي' },
    default: true,
    value: true,
    contrast_with: null,
    options: [] as string[],
  },
]

function payload(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      design: { id: 1, name: { en: 'Classic', ar: 'كلاسيك' } },
      settings: CLASSIC_SETTINGS,
      fonts: [LATIN],
      ...overrides,
    },
  }
}

function stub(overrides: Record<string, unknown> = {}) {
  mock.onGet('/api/appearance').reply(200, payload(overrides))
}

function sentBody() {
  const put = mock.history.put.find((call) => call.url === '/api/appearance')
  return put ? (JSON.parse(put.data as string) as Record<string, unknown>) : undefined
}

describe('AppearancePage', () => {
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

  describe('design settings', () => {
    it('shows one field per colour the design declares, labelled from the design', async () => {
      stub()
      renderWithProviders(<AppearancePage locale="en" />)

      expect(await screen.findByRole('textbox', { name: 'Main colour' })).toBeInTheDocument()
      for (const label of ['Background', 'Text']) {
        expect(screen.getByRole('textbox', { name: label })).toBeInTheDocument()
      }
      expect(screen.getByText(/What Classic lets you change/)).toBeInTheDocument()
    })

    it('shows whatever a different design declares, with the key when it has no label', async () => {
      stub({
        design: { id: 2, name: { en: 'Midnight', ar: null } },
        settings: [
          {
            key: 'neon_glow',
            type: 'color',
            options: [],
            label: { en: null, ar: null },
            default: '#39FF14',
            value: '#39FF14',
            contrast_with: null,
          },
        ],
      })
      renderWithProviders(<AppearancePage locale="en" />)

      expect(await screen.findByRole('textbox', { name: 'Neon glow' })).toHaveValue('#39FF14')
      expect(screen.queryByRole('textbox', { name: 'Main colour' })).not.toBeInTheDocument()
    })

    it('says so when the design has a fixed look', async () => {
      stub({ settings: [] })
      renderWithProviders(<AppearancePage locale="en" />)

      expect(
        await screen.findByText('Classic has a fixed look: there is nothing to change.'),
      ).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
    })

    it('sends only the colours that changed', async () => {
      stub()
      mock.onPut('/api/appearance').reply(200, payload())
      const user = userEvent.setup()
      renderWithProviders(<AppearancePage locale="en" />)

      const main = await screen.findByRole('textbox', { name: 'Main colour' })
      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()

      await user.clear(main)
      await user.type(main, '#C0392B')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => expect(sentBody()).toEqual({ settings: { primary_color: '#C0392B' } }))
    })

    it('puts one colour back to the design default, which saves as null', async () => {
      stub({
        settings: [{ ...CLASSIC_SETTINGS[0]!, value: '#C0392B' }, ...CLASSIC_SETTINGS.slice(1)],
      })
      mock.onPut('/api/appearance').reply(200, payload())
      const user = userEvent.setup()
      renderWithProviders(<AppearancePage locale="en" />)

      await user.click(
        await screen.findByRole('button', { name: "Reset Main colour to the design's colour" }),
      )
      expect(screen.getByRole('textbox', { name: 'Main colour' })).toHaveValue('#F8D38D')
      // Only a colour that differs from the default offers a reset.
      expect(
        screen.queryByRole('button', { name: "Reset Background to the design's colour" }),
      ).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Save' }))
      await waitFor(() => expect(sentBody()).toEqual({ settings: { primary_color: null } }))
    })

    it('switches the name in the top bar off, and back on saves as the default', async () => {
      stub()
      mock.onPut('/api/appearance').reply(200, payload())
      const user = userEvent.setup()
      renderWithProviders(<AppearancePage locale="en" />)

      const name = await screen.findByRole('switch', { name: 'Name in the top bar' })
      expect(name).toBeChecked()

      await user.click(name)
      await user.click(screen.getByRole('button', { name: 'Save' }))
      await waitFor(() => expect(sentBody()).toEqual({ settings: { show_name: false } }))
    })

    it('draws a choice and a text setting from the design too', async () => {
      stub({
        settings: [
          {
            key: 'density',
            type: 'select',
            label: { en: 'Density', ar: null },
            default: 'cosy',
            value: 'cosy',
            contrast_with: null,
            options: ['cosy', 'compact'],
          },
          {
            key: 'welcome_line',
            type: 'text',
            label: { en: null, ar: null },
            default: 'Welcome',
            value: 'Welcome',
            contrast_with: null,
            options: [],
          },
        ],
      })
      renderWithProviders(<AppearancePage locale="en" />)

      const density = await screen.findByRole('group', { name: 'Density' })
      expect(within(density).getByRole('radio', { name: 'Cosy' })).toBeChecked()
      expect(within(density).getByRole('radio', { name: 'Compact' })).not.toBeChecked()
      expect(screen.getByRole('textbox', { name: 'Welcome line' })).toHaveValue('Welcome')
    })

    it('warns when a colour is hard to read on the one it sits on', async () => {
      stub()
      const user = userEvent.setup()
      renderWithProviders(<AppearancePage locale="en" />)

      const text = await screen.findByRole('textbox', { name: 'Text' })
      expect(screen.queryByText(/Hard to read on Background/)).not.toBeInTheDocument()

      await user.clear(text)
      await user.type(text, '#EEEEEE')

      expect(await screen.findByText(/Hard to read on Background/)).toBeInTheDocument()
    })
  })

  describe('fonts', () => {
    it('has one picker when the languages share letters', async () => {
      stub({ fonts: [{ ...LATIN, languages: ['en', 'es'] }] })
      renderWithProviders(<AppearancePage locale="en" />)

      expect(await screen.findByRole('group', { name: 'English · Spanish' })).toBeInTheDocument()
      expect(screen.getAllByRole('group')).toHaveLength(1)
    })

    it('has a picker per writing system, each font drawing its sample', async () => {
      stub({ fonts: [LATIN, ARABIC] })
      renderWithProviders(<AppearancePage locale="en" />)

      const arabic = await screen.findByRole('group', { name: 'Arabic' })
      expect(screen.getByRole('group', { name: 'English' })).toBeInTheDocument()
      expect(within(arabic).getByRole('radio', { name: /Cairo/ })).not.toBeChecked()
      expect(within(arabic).getByRole('radio', { name: /El Messiri/ })).toBeChecked()
      expect(within(arabic).getAllByText('حلوم مشوي بالزعتر')).toHaveLength(2)
    })

    it('saves a font the moment it is picked', async () => {
      stub({ fonts: [LATIN, ARABIC] })
      mock
        .onPut('/api/appearance')
        .reply(200, payload({ fonts: [LATIN, { ...ARABIC, value: 'Cairo' }] }))
      const user = userEvent.setup()
      renderWithProviders(<AppearancePage locale="en" />)

      const arabic = await screen.findByRole('group', { name: 'Arabic' })
      await user.click(within(arabic).getByRole('radio', { name: /Cairo/ }))

      expect(within(arabic).getByRole('radio', { name: /Cairo/ })).toBeChecked()
      await waitFor(() => expect(sentBody()).toEqual({ fonts: { arabic: 'Cairo' } }))
    })

    it('snaps back when a font fails to save', async () => {
      stub({ fonts: [LATIN] })
      mock.onPut('/api/appearance').reply(422, { message: 'Please choose a font from the list.' })
      const user = userEvent.setup()
      renderWithProviders(<AppearancePage locale="en" />)

      await user.click(await screen.findByRole('radio', { name: /Lora/ }))

      await waitFor(() => expect(screen.getByRole('radio', { name: /Inter/ })).toBeChecked())
    })
  })
})
