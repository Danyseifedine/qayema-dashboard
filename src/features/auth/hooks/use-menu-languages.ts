import { useSession } from '@/features/auth/hooks/use-session'
import { DEFAULT_MAIN_LANGUAGE } from '@/shared/constants/menu-languages'

const BEFORE_SESSION = [DEFAULT_MAIN_LANGUAGE] as const

/**
 * The languages this restaurant's menu is written in (the main one first,
 * then the second language when there is one), for every translatable form field.
 * Changing them in Settings refreshes the session, so forms follow.
 */
export function useMenuLanguages(): readonly string[] {
  const session = useSession()
  return session.data?.restaurant?.languages ?? BEFORE_SESSION
}
