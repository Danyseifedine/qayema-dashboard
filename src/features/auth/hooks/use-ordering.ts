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

/**
 * How orders at the table reach this restaurant, or null when it takes none:
 * the same rule as the server's Restaurant::dineInChannel(). WhatsApp needs
 * a number it can reach; without one they arrive here.
 */
export function useTableOrderingMode(): OrderMode | null {
  const restaurant = useSession().data?.restaurant
  if (!restaurant?.plan.dine_in || restaurant.switched_off.includes('dine_in')) {
    return null
  }
  const { dine_in, whatsapp_number } = restaurant.ordering
  return dine_in === 'whatsapp' && whatsapp_number ? 'whatsapp' : 'menu'
}
