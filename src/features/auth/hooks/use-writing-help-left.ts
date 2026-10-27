import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { sessionKeys } from '@/features/auth/hooks/session-keys'
import type { AuthUser } from '@/features/auth/schemas/user.schema'
import { withLeft, type WritingHelpLeft } from '@/shared/hooks/use-writing-help'

/**
 * Keeps the session's `writing_help` in step: each AI answer says how many
 * credits are left this month, and every AI button reads them from the
 * session (WritingHelpProvider in App). Off writing help
 * stays off.
 */
export function useWritingHelpLeft(): (left: WritingHelpLeft) => void {
  const queryClient = useQueryClient()

  return useCallback(
    (left) =>
      queryClient.setQueryData<AuthUser>(sessionKeys.current(), (current) =>
        current?.restaurant?.writing_help
          ? {
              ...current,
              restaurant: {
                ...current.restaurant,
                writing_help: withLeft(current.restaurant.writing_help, left),
              },
            }
          : current,
      ),
    [queryClient],
  )
}
