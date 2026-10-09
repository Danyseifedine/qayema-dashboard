import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { sessionKeys } from '@/features/auth'
import type { AuthUser } from '@/features/auth'
import { t } from '@/lib/i18n'
import { appearanceKeys } from '@/features/appearance'
import { categoryKeys, dishKeys } from '@/features/menu'
import { restaurantKeys } from '@/features/restaurant/hooks/restaurant-keys'
import { toast } from '@/shared/components/feedback'
import type { ApiError } from '@/shared/types/api'
import {
  fetchMenuLanguages,
  saveMenuLanguages,
  type MenuLanguages,
} from '@/features/restaurant/api/menu-languages.api'

/** The menu's languages, with what still has no name in the main one. */
export function useMenuLanguagesState() {
  return useQuery({ queryKey: restaurantKeys.languages(), queryFn: fetchMenuLanguages })
}

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
      const { missing: _missing, ...languages } = saved
      queryClient.setQueryData<AuthUser>(sessionKeys.current(), (user) =>
        user?.restaurant ? { ...user, restaurant: { ...user.restaurant, ...languages } } : user,
      )
      // Menu text follows the languages: every page that shows it drops its
      // copy and loads again, so none opens on the old languages first.
      for (const key of [restaurantKeys.all, categoryKeys.all, dishKeys.all, appearanceKeys.all]) {
        void queryClient.resetQueries({ queryKey: key })
      }
      // After the reset, so the notice of what to write opens on the answer.
      queryClient.setQueryData(restaurantKeys.languages(), saved)
      toast.success(t('features:languages.saved'))
    },
    onError: (error) => toast.error(t('features:languages.saveFailed'), error),
  })
}
