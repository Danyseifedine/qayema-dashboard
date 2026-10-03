import { useMemo } from 'react'
import { useSession } from '@/features/auth/hooks/use-session'
import type { OrderMode } from '@/features/auth/schemas/user.schema'

/**
 * How this restaurant takes orders right now, or null when it takes none:
 * the same rule as the server's Restaurant::orderChannel(). The session
 * already reports `menu` only while the package includes it.
 */
export function useOrderingMode(): OrderMode | null {
  const restaurant = useSession().data?.restaurant
  const on = Boolean(restaurant?.plan.ordering) && !restaurant?.switched_off.includes('orders')
  const mode = on ? (restaurant?.ordering.mode ?? null) : null

  return useMemo(() => mode, [mode])
}
