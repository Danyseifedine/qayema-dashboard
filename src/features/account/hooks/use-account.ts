import { useMutation, useQueryClient } from '@tanstack/react-query'
import { sessionKeys } from '@/features/auth/hooks/use-session'
import type { AuthUser } from '@/features/auth/schemas/user.schema'
import { toast } from '@/shared/components/feedback'
import type { ApiError } from '@/shared/types/api'
import { updatePassword, updateProfile, type PasswordPayload } from '../api/account.api'

/**
 * The owner's own name. It comes back as the whole session payload, which is
 * written straight into the cache: the topbar and the user menu draw from it.
 */
export function useSaveProfile() {
  const queryClient = useQueryClient()

  return useMutation<AuthUser, ApiError, string>({
    mutationFn: updateProfile,
    onSuccess: (user) => {
      toast.success('Profile saved')
      queryClient.setQueryData(sessionKeys.current(), user)
    },
    onError: (error) => toast.error('Could not save your profile', error),
  })
}

/**
 * Changing the password signs every other "keep me signed in" browser out.
 * The session payload carries `has_password`, so it is refetched: a
 * Google-only account that just set one now has a different form to show.
 */
export function useSavePassword(hasPassword: boolean) {
  const queryClient = useQueryClient()

  return useMutation<{ has_password: boolean }, ApiError, PasswordPayload>({
    mutationFn: updatePassword,
    onSuccess: () => {
      toast.success(
        hasPassword ? 'Password changed' : 'Password set',
        'Any other browser you stayed signed in on has been signed out.',
      )
      void queryClient.invalidateQueries({ queryKey: sessionKeys.all })
    },
    onError: (error) =>
      toast.error(
        hasPassword ? 'Could not change your password' : 'Could not set a password',
        error,
      ),
  })
}
