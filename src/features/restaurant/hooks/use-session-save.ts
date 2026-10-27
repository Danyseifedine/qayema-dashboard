import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { sessionKeys } from '@/features/auth'
import type { AuthRestaurant, AuthUser } from '@/features/auth'
import { t } from '@/lib/i18n'
import { toast } from '@/shared/components/feedback'
import type { ApiError } from '@/shared/types/api'

/** The session with its restaurant changed by `patch`; one without a restaurant is left as it is. */
export function patchRestaurant(
  user: AuthUser | undefined,
  patch: (restaurant: AuthRestaurant) => Partial<AuthRestaurant>,
): AuthUser | undefined {
  return user?.restaurant
    ? { ...user, restaurant: { ...user.restaurant, ...patch(user.restaurant) } }
    : user
}

/**
 * A Features page save that writes into the session. Optimistic: `apply`
 * puts the change in the session on the tap, the server's answer is applied
 * the same way, and a failure puts back what was there with an error toast
 * (no success toast: the page already moved).
 */
export function useSessionSave<T>(
  save: (value: T) => Promise<T>,
  apply: (user: AuthUser | undefined, value: T) => AuthUser | undefined,
  onSaved?: (saved: T, queryClient: QueryClient) => void,
) {
  const queryClient = useQueryClient()

  return useMutation<T, ApiError, T, { previous: AuthUser | undefined }>({
    mutationFn: save,
    onMutate: async (value) => {
      await queryClient.cancelQueries({ queryKey: sessionKeys.current() })
      const previous = queryClient.getQueryData<AuthUser>(sessionKeys.current())
      queryClient.setQueryData(sessionKeys.current(), apply(previous, value))
      return { previous }
    },
    onSuccess: (saved) => {
      queryClient.setQueryData<AuthUser>(sessionKeys.current(), (user) => apply(user, saved))
      onSaved?.(saved, queryClient)
    },
    onError: (error, _value, context) => {
      queryClient.setQueryData(sessionKeys.current(), context?.previous)
      toast.error(t('features:saveFailed'), error)
    },
  })
}
