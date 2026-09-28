import { useMutation, useQueryClient } from '@tanstack/react-query'
import { sessionKeys } from '@/features/auth'
import { appearanceKeys } from '@/features/appearance'
import type { AuthUser } from '@/features/auth'
import { t } from '@/lib/i18n'
import { toast } from '@/shared/components/feedback'
import type { ApiError } from '@/shared/types/api'
import { saveSwitchedOff } from '@/features/restaurant/api/features.api'

function withOff(user: AuthUser | undefined, off: string[]): AuthUser | undefined {
  return user?.restaurant
    ? { ...user, restaurant: { ...user.restaurant, switched_off: off } }
    : user
}

/**
 * Switches optional features off and on. Optimistic: the sidebar changes on
 * the tap, from the session cache, and snaps back with an error toast if the
 * save fails, so, per convention, there is no success toast.
 */
export function useSaveSwitchedOff() {
  const queryClient = useQueryClient()

  return useMutation<string[], ApiError, string[], { previous: AuthUser | undefined }>({
    mutationFn: saveSwitchedOff,
    onMutate: async (off) => {
      await queryClient.cancelQueries({ queryKey: sessionKeys.current() })
      const previous = queryClient.getQueryData<AuthUser>(sessionKeys.current())
      queryClient.setQueryData(sessionKeys.current(), withOff(previous, off))
      return { previous }
    },
    onSuccess: (off) => {
      queryClient.setQueryData<AuthUser>(sessionKeys.current(), (user) => withOff(user, off))
      // "Multiple languages" decides which scripts get a font picker.
      void queryClient.invalidateQueries({ queryKey: appearanceKeys.all })
    },
    onError: (error, _off, context) => {
      queryClient.setQueryData(sessionKeys.current(), context?.previous)
      toast.error(t('features:saveFailed'), error)
    },
  })
}
