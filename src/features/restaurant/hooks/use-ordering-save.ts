import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { analyticsKeys } from '@/features/analytics'
import { sessionKeys } from '@/features/auth'
import type { AuthRestaurant, AuthUser } from '@/features/auth'
import { orderKeys } from '@/features/orders'
import { t } from '@/lib/i18n'
import { toast } from '@/shared/components/feedback'
import type { ApiError } from '@/shared/types/api'
import {
  saveDineIn,
  saveOrdering,
  type DineInMode,
  type OrderingSettings,
} from '@/features/restaurant/api/ordering.api'

function withOrdering(
  user: AuthUser | undefined,
  ordering: Partial<AuthRestaurant['ordering']>,
): AuthUser | undefined {
  return user?.restaurant
    ? {
        ...user,
        restaurant: { ...user.restaurant, ordering: { ...user.restaurant.ordering, ...ordering } },
      }
    : user
}

/** After either save: the order pages and analytics read differently now. */
function refreshOrderViews(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: orderKeys.all })
  // Reset, not invalidated, so analytics opens on its skeleton rather than
  // the old way's numbers: each counts only its own orders.
  void queryClient.resetQueries({ queryKey: analyticsKeys.all })
}

/**
 * Saves how guests send their orders. Optimistic like the feature switches:
 * the choice moves on the tap and snaps back with an error toast if the
 * save fails.
 */
export function useSaveOrdering() {
  const queryClient = useQueryClient()

  return useMutation<
    OrderingSettings,
    ApiError,
    OrderingSettings,
    { previous: AuthUser | undefined }
  >({
    mutationFn: saveOrdering,
    onMutate: async (ordering) => {
      await queryClient.cancelQueries({ queryKey: sessionKeys.current() })
      const previous = queryClient.getQueryData<AuthUser>(sessionKeys.current())
      queryClient.setQueryData(sessionKeys.current(), withOrdering(previous, ordering))
      return { previous }
    },
    onSuccess: (ordering) => {
      queryClient.setQueryData<AuthUser>(sessionKeys.current(), (user) =>
        withOrdering(user, ordering),
      )
      refreshOrderViews(queryClient)
    },
    onError: (error, _ordering, context) => {
      queryClient.setQueryData(sessionKeys.current(), context?.previous)
      toast.error(t('features:saveFailed'), error)
    },
  })
}

/**
 * Saves how orders at the table come in: the Table orders page, or
 * WhatsApp. Optimistic the same way.
 */
export function useSaveDineIn() {
  const queryClient = useQueryClient()

  return useMutation<DineInMode, ApiError, DineInMode, { previous: AuthUser | undefined }>({
    mutationFn: saveDineIn,
    onMutate: async (mode) => {
      await queryClient.cancelQueries({ queryKey: sessionKeys.current() })
      const previous = queryClient.getQueryData<AuthUser>(sessionKeys.current())
      queryClient.setQueryData(sessionKeys.current(), withOrdering(previous, { dine_in: mode }))
      return { previous }
    },
    onSuccess: (mode) => {
      queryClient.setQueryData<AuthUser>(sessionKeys.current(), (user) =>
        withOrdering(user, { dine_in: mode }),
      )
      refreshOrderViews(queryClient)
    },
    onError: (error, _mode, context) => {
      queryClient.setQueryData(sessionKeys.current(), context?.previous)
      toast.error(t('features:saveFailed'), error)
    },
  })
}
