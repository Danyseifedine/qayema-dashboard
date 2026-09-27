import { useSession } from '@/features/auth/hooks/use-session'
import { MAIN_LANGUAGE } from '@/shared/constants/menu-languages'

const ENGLISH_ONLY = [MAIN_LANGUAGE] as const

/**
 * The languages this restaurant's menu is written in — English first, then
 * the second language when there is one — for every translatable form field.
 * Changing them in Settings refreshes the session, so forms follow.
 */
export function useMenuLanguages(): readonly string[] {
  const session = useSession()
  return session.data?.restaurant?.languages ?? ENGLISH_ONLY
}
