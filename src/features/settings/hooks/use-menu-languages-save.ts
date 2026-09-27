import { useMutation, useQueryClient } from '@tanstack/react-query'
import { sessionKeys } from '@/features/auth/hooks/use-session'
import type { AuthUser } from '@/features/auth/schemas/user.schema'
import { t } from '@/lib/i18n'
import { QUERY_ROOTS } from '@/lib/query/keys'
import { toast } from '@/shared/components/feedback'
import type { ApiError } from '@/shared/types/api'
import { saveMenuLanguages, type MenuLanguages } from '../api/menu-languages.api'

/**
 * Saves the menu's languages from the Features page. Every translatable form
 * and list is keyed by them, so the session is updated in place and the menu
 * and settings data are fetched again with the new languages' entries.
 */
export function useSaveMenuLanguages() {
  const queryClient = useQueryClient()

  return useMutation<MenuLanguages, ApiError, Parameters<typeof saveMenuLanguages>[0]>({
    mutationFn: saveMenuLanguages,
    onSuccess: (saved) => {
      queryClient.setQueryData<AuthUser>(sessionKeys.current(), (user) =>
        user?.restaurant ? { ...user, restaurant: { ...user.restaurant, ...saved } } : user,
      )
      for (const root of [QUERY_ROOTS.settings, QUERY_ROOTS.categories, QUERY_ROOTS.dishes]) {
        void queryClient.invalidateQueries({ queryKey: [root] })
      }
      toast.success(t('settings:features.languages.saved'))
    },
    onError: (error) => toast.error(t('settings:features.languages.saveFailed'), error),
  })
}
