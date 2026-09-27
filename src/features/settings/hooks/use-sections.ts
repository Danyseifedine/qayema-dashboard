import { useMutation, useQueryClient } from '@tanstack/react-query'
import { sessionKeys } from '@/features/auth/hooks/use-session'
import type { AuthUser } from '@/features/auth/schemas/user.schema'
import { t } from '@/lib/i18n'
import { toast } from '@/shared/components/feedback'
import type { ApiError } from '@/shared/types/api'
import { saveHiddenSections } from '../api/sections.api'

function withHidden(user: AuthUser | undefined, hidden: string[]): AuthUser | undefined {
  return user?.restaurant
    ? { ...user, restaurant: { ...user.restaurant, hidden_sections: hidden } }
    : user
}

/**
 * Switches dashboard sections on and off. Optimistic: the sidebar changes on
 * the tap, from the session cache, and snaps back with an error toast if the
 * save fails — so, per convention, there is no success toast.
 */
export function useSaveHiddenSections() {
  const queryClient = useQueryClient()

  return useMutation<string[], ApiError, string[], { previous: AuthUser | undefined }>({
    mutationFn: saveHiddenSections,
    onMutate: async (hidden) => {
      await queryClient.cancelQueries({ queryKey: sessionKeys.current() })
      const previous = queryClient.getQueryData<AuthUser>(sessionKeys.current())
      queryClient.setQueryData(sessionKeys.current(), withHidden(previous, hidden))
      return { previous }
    },
    onSuccess: (hidden) => {
      queryClient.setQueryData<AuthUser>(sessionKeys.current(), (user) => withHidden(user, hidden))
    },
    onError: (error, _hidden, context) => {
      queryClient.setQueryData(sessionKeys.current(), context?.previous)
      toast.error(t('settings:features.saveFailed'), error)
    },
  })
}
