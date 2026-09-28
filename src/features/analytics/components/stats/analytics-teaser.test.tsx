import { screen, waitFor } from '@testing-library/react'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { renderWithProviders } from '@/test/utils/render-with-providers'
import { AnalyticsTeaser } from '@/features/analytics/components/stats/analytics-teaser'

let mock: MockAdapter

describe('AnalyticsTeaser', () => {
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

  it('says how many people opened the menu this week', async () => {
    mock.onGet('/api/analytics/teaser').reply(200, { data: { range: '7d', views: 1234 } })
    renderWithProviders(<AnalyticsTeaser locale="en" />)

    expect(await screen.findByText('1,234 people opened your menu this week.')).toBeInTheDocument()
  })

  it('uses the singular for one person', async () => {
    mock.onGet('/api/analytics/teaser').reply(200, { data: { range: '7d', views: 1 } })
    renderWithProviders(<AnalyticsTeaser locale="en" />)

    expect(await screen.findByText('1 person opened your menu this week.')).toBeInTheDocument()
  })

  it('shows nothing when the number cannot load', async () => {
    mock.onGet('/api/analytics/teaser').reply(500, { message: 'Server error', code: 'x' })
    renderWithProviders(<AnalyticsTeaser locale="en" />)

    await waitFor(() =>
      expect(mock.history.get.some((call) => call.url === '/api/analytics/teaser')).toBe(true),
    )
    expect(screen.queryByText(/opened your menu/)).not.toBeInTheDocument()
  })
})
