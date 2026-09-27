import { useMutation, useQueryClient } from '@tanstack/react-query'
import { sessionKeys } from '@/features/auth'
import type { AuthUser } from '@/features/auth'
import { t } from '@/lib/i18n'
import { categoryKeys, dishKeys } from '@/features/menu'
import { restaurantKeys } from '@/features/restaurant/hooks/restaurant-keys'
import { toast } from '@/shared/components/feedback'
import type { ApiError } from '@/shared/types/api'
import { saveMenuLanguages, type MenuLanguages } from '@/features/restaurant/api/menu-languages.api'

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
      // Menu text follows the languages: every list that shows it reloads.
      for (const key of [restaurantKeys.all, categoryKeys.all, dishKeys.all]) {
        void queryClient.invalidateQueries({ queryKey: key })
      }
      toast.success(t('features:languages.saved'))
    },
    onError: (error) => toast.error(t('features:languages.saveFailed'), error),
  })
}
