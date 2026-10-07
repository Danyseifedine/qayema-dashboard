import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { sessionKeys } from '@/features/auth'
import { qrKeys } from '@/features/qr'
import { t } from '@/lib/i18n'
import { toast } from '@/shared/components/feedback'
import type { ApiError } from '@/shared/types/api'
import {
  changeSlug,
  fetchRestaurant,
  updateRestaurant,
  type RestaurantPayload,
} from '@/features/restaurant/api/restaurant.api'
import type { Restaurant } from '@/features/restaurant/schemas/restaurant.schema'
import { restaurantKeys } from '@/features/restaurant/hooks/restaurant-keys'

export function useRestaurant(): UseQueryResult<Restaurant, ApiError> {
  return useQuery<Restaurant, ApiError>({
    queryKey: restaurantKeys.detail(),
    queryFn: ({ signal }) => fetchRestaurant(signal),
    staleTime: 30_000,
  })
}

/**
 * Saving returns the restaurant as stored, so the cache is written from the
 * response rather than refetched. The session is invalidated as well: the
 * name and logo it carries are what the topbar and the sidebar draw.
 */
export function useSaveRestaurant() {
  const queryClient = useQueryClient()

  return useMutation<Restaurant, ApiError, RestaurantPayload>({
    mutationFn: updateRestaurant,
    onSuccess: (saved) => {
      toast.success(t('restaurant:toast.savedTitle'), t('restaurant:toast.savedDescription'))
      queryClient.setQueryData(restaurantKeys.detail(), saved)
      void queryClient.invalidateQueries({ queryKey: sessionKeys.all })
    },
    onError: (error) => toast.error(t('restaurant:toast.saveFailed'), error),
  })
}

/**
 * A new menu link. The session and the QR page carry the menu's address, so
 * they are refreshed with the restaurant.
 */
export function useChangeSlug() {
  const queryClient = useQueryClient()

  return useMutation<Restaurant, ApiError, string>({
    mutationFn: changeSlug,
    onSuccess: (saved) => {
      toast.success(t('restaurant:link.changedTitle'), t('restaurant:link.changedDescription'))
      queryClient.setQueryData(restaurantKeys.detail(), saved)
      void queryClient.invalidateQueries({ queryKey: sessionKeys.all })
      // The QR page shows the link a new code would carry.
      void queryClient.invalidateQueries({ queryKey: qrKeys.all })
    },
    onError: (error) => toast.error(t('restaurant:link.changeFailed'), error),
  })
}
