import { useSession } from '@/features/auth/hooks/use-session'
import type { Plan } from '@/features/auth/schemas/user.schema'

/**
 * Whether an admin turned this feature off for the restaurant
 * (`restaurant.turned_off`). Its `plan` flag is false then too, so whatever
 * it locks stays locked; this only changes what the owner is told: that
 * Qayema turned it off for them, rather than to move to another package.
 */
export function useTurnedOff(flag: keyof Plan): boolean {
  return useSession().data?.restaurant?.turned_off.includes(flag) ?? false
}
