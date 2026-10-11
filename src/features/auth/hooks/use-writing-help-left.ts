import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { sessionKeys } from '@/features/auth/hooks/session-keys'
import type { AuthUser } from '@/features/auth/schemas/user.schema'

/**
 * Keeps the session's `writing_help.left` in step: each AI answer says how
 * many uses are left today, and every AI button reads the count from the
 * session (WritingHelpProvider in App). Off writing help stays off.
 */
export function useWritingHelpLeft(): (left: number | null) => void {
  const queryClient = useQueryClient()

  return useCallback(
    (left) =>
      queryClient.setQueryData<AuthUser>(sessionKeys.current(), (current) =>
        current?.restaurant?.writing_help
          ? {
              ...current,
              restaurant: {
                ...current.restaurant,
                writing_help: { ...current.restaurant.writing_help, left },
              },
            }
          : current,
      ),
    [queryClient],
  )
}
