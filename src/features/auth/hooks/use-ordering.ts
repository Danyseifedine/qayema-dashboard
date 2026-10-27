import { useSession } from '@/features/auth/hooks/use-session'
import type { OrderMode } from '@/features/auth/schemas/user.schema'

/**
 * How this restaurant takes orders for delivery and pickup right now, or
 * null when it takes none: the same rule as the server's
 * Restaurant::orderChannel(). Each way is a package switch of its own
 * (`ordering` WhatsApp, `menu_ordering` the menu); the session's `mode` is
 * already the only way the package has, or the owner's pick of both.
 */
export function useOrderingMode(): OrderMode | null {
  const restaurant = useSession().data?.restaurant
  const on =
    Boolean(restaurant?.plan.ordering || restaurant?.plan.menu_ordering) &&
    !restaurant?.switched_off.includes('orders')
  return on ? (restaurant?.ordering.mode ?? null) : null
}

/**
 * How orders at the table reach this restaurant, or null when it takes none:
 * the same rule as the server's Restaurant::dineInChannel(). Each way is a
 * package switch (`dine_in` the menu, `dine_in_whatsapp`); WhatsApp needs a
 * number it can reach, and without one they arrive here when the package
 * has that way, and nowhere when WhatsApp is its only way.
 */
export function useTableOrderingMode(): OrderMode | null {
  const restaurant = useSession().data?.restaurant
  if (!restaurant || restaurant.switched_off.includes('dine_in')) {
    return null
  }
  const { dine_in, whatsapp_number } = restaurant.ordering
  const whatsapp = restaurant.plan.dine_in_whatsapp && whatsapp_number
  const menu = restaurant.plan.dine_in
  if (whatsapp && (dine_in === 'whatsapp' || !menu)) return 'whatsapp'
  return menu ? 'menu' : null
}
