import { useMutation, useQueryClient } from '@tanstack/react-query'
import { analyticsKeys } from '@/features/analytics'
import { sessionKeys } from '@/features/auth'
import type { AuthUser } from '@/features/auth'
import { orderKeys } from '@/features/orders'
import { t } from '@/lib/i18n'
import { toast } from '@/shared/components/feedback'
import type { ApiError } from '@/shared/types/api'
import { saveOrdering, type OrderingSettings } from '@/features/restaurant/api/ordering.api'

function withOrdering(
  user: AuthUser | undefined,
  ordering: OrderingSettings,
): AuthUser | undefined {
  return user?.restaurant ? { ...user, restaurant: { ...user.restaurant, ordering } } : user
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
      // The Orders page reads differently in each mode.
      void queryClient.invalidateQueries({ queryKey: orderKeys.all })
      // So does analytics: in-menu orders have a section of their own, and
      // each mode counts only its own orders. Reset, not invalidated, so the
      // page opens on its skeleton rather than the old mode's numbers.
      void queryClient.resetQueries({ queryKey: analyticsKeys.all })
    },
    onError: (error, _ordering, context) => {
      queryClient.setQueryData(sessionKeys.current(), context?.previous)
      toast.error(t('features:saveFailed'), error)
    },
  })
}
