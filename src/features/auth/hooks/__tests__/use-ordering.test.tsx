import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import MockAdapter from 'axios-mock-adapter'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { api } from '@/lib/api/client'
import type { AuthUser } from '@/features/auth/schemas/user.schema'
import { useOrderingMode, useTableOrderingMode } from '@/features/auth/hooks/use-ordering'
import { FULL_PLAN, makeSessionUser } from '@/test/factories/session'

let mock: MockAdapter

type Restaurant = NonNullable<AuthUser['restaurant']>

const NO_WAYS = {
  ...FULL_PLAN,
  ordering: false,
  menu_ordering: false,
  dine_in: false,
  dine_in_whatsapp: false,
}

/** What a hook says once the session holds this restaurant. */
async function modeOf(hook: () => unknown, restaurant: Partial<Restaurant>): Promise<unknown> {
  mock.onGet('/api/user').reply(200, { data: makeSessionUser(restaurant) })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(hook, { wrapper })
  await waitFor(() => expect(mock.history.get).toHaveLength(1))
  await waitFor(() => expect(queryClient.isFetching()).toBe(0))
  return result.current
}

const ordering = makeSessionUser().restaurant!.ordering

describe('useOrderingMode', () => {
  beforeEach(() => {
    mock = new MockAdapter(api)
  })

  afterEach(() => mock.restore())

  it('takes orders with either way, as the session says it goes', async () => {
    expect(
      await modeOf(useOrderingMode, {
        plan: { ...NO_WAYS, menu_ordering: true },
        ordering: { ...ordering, mode: 'menu' },
      }),
    ).toBe('menu')
  })

  it('takes none with neither way', async () => {
    expect(await modeOf(useOrderingMode, { plan: NO_WAYS })).toBeNull()
  })

  it('takes none while the owner switched orders off', async () => {
    expect(await modeOf(useOrderingMode, { switched_off: ['orders'] })).toBeNull()
  })
})

describe('useTableOrderingMode', () => {
  beforeEach(() => {
    mock = new MockAdapter(api)
  })

  afterEach(() => mock.restore())

  it('goes to WhatsApp when it is the only way and there is a number', async () => {
    expect(
      await modeOf(useTableOrderingMode, {
        plan: { ...NO_WAYS, dine_in_whatsapp: true },
        ordering: { ...ordering, dine_in: 'whatsapp' },
      }),
    ).toBe('whatsapp')
  })

  it('takes none when WhatsApp is the only way and there is no number', async () => {
    expect(
      await modeOf(useTableOrderingMode, {
        plan: { ...NO_WAYS, dine_in_whatsapp: true },
        ordering: { ...ordering, dine_in: 'whatsapp', whatsapp_number: false },
      }),
    ).toBeNull()
  })

  it("follows the owner's pick of both, and the dashboard without a number", async () => {
    expect(
      await modeOf(useTableOrderingMode, { ordering: { ...ordering, dine_in: 'whatsapp' } }),
    ).toBe('whatsapp')
    mock.restore()
    mock = new MockAdapter(api)
    expect(
      await modeOf(useTableOrderingMode, {
        ordering: { ...ordering, dine_in: 'whatsapp', whatsapp_number: false },
      }),
    ).toBe('menu')
  })

  it('takes none with neither way, or switched off', async () => {
    expect(await modeOf(useTableOrderingMode, { plan: NO_WAYS })).toBeNull()
    mock.restore()
    mock = new MockAdapter(api)
    expect(await modeOf(useTableOrderingMode, { switched_off: ['dine_in'] })).toBeNull()
  })
})
