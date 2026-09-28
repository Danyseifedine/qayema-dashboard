import { useQueryClient } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { configureApi } from '@/lib/api'
import { AppProviders } from '@/app/providers/app-providers'

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  configureApi: vi.fn(),
}))

function CacheProbe() {
  const client = useQueryClient()
  return <p>staleTime {String(client.getDefaultOptions().queries?.staleTime)}</p>
}

describe('AppProviders', () => {
  afterEach(() => {
    vi.mocked(configureApi).mockClear()
  })

  it('wires the API once and gives the app the shared cache', () => {
    const { rerender } = render(
      <AppProviders>
        <CacheProbe />
      </AppProviders>,
    )

    expect(screen.getByText('staleTime 30000')).toBeInTheDocument()
    rerender(
      <AppProviders>
        <CacheProbe />
      </AppProviders>,
    )
    expect(configureApi).toHaveBeenCalledOnce()
    expect(configureApi).toHaveBeenCalledWith()
  })

  it('keeps one cache across re-renders', () => {
    const clients: unknown[] = []
    function Collect() {
      clients.push(useQueryClient())
      return null
    }
    const { rerender } = render(
      <AppProviders>
        <Collect />
      </AppProviders>,
    )
    rerender(
      <AppProviders>
        <Collect />
      </AppProviders>,
    )

    expect(clients.length).toBeGreaterThanOrEqual(2)
    expect(new Set(clients).size).toBe(1)
  })
})
