import { useSession } from '@/features/auth/hooks/use-session'

/**
 * Whether the menu comes from a POS branch now (the session's
 * `pos_connected`): the POS owns the categories and dishes, so they cannot
 * be added, deleted or changed here but for their icon and order, and
 * Offers and Build your own are off. False until the session says.
 */
export function usePosConnected(): boolean {
  return Boolean(useSession().data?.restaurant?.pos_connected)
}
