import { screen } from '@testing-library/react'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { EMPTY_PLAN, makeSessionUser } from '@/test/factories/session'
import { renderWithProviders } from '@/test/render-with-providers'
import { RangePicker } from '@/features/analytics/components/range/range-picker'

let mock: MockAdapter

describe('RangePicker', () => {
  beforeEach(() => {
    mock = new MockAdapter(api)
  })

  afterEach(() => mock.restore())

  it('says the longer ranges come with advanced analytics', () => {
    renderWithProviders(<RangePicker value="today" onChange={vi.fn()} advanced={false} />)

    expect(screen.getAllByTitle('Comes with advanced analytics')).toHaveLength(2)
  })

  it('says they are turned off when the admin turned advanced analytics off', async () => {
    mock.onGet('/api/user').reply(200, {
      data: makeSessionUser({ plan: EMPTY_PLAN, turned_off: ['advanced_analytics'] }),
    })
    renderWithProviders(<RangePicker value="today" onChange={vi.fn()} advanced={false} />)

    expect(await screen.findAllByTitle('Turned off for your restaurant')).toHaveLength(2)
    expect(screen.queryByTitle('Comes with advanced analytics')).not.toBeInTheDocument()
  })
})
