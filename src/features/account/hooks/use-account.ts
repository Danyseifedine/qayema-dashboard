import { useMutation, useQueryClient } from '@tanstack/react-query'
import { sessionKeys } from '@/features/auth/hooks/use-session'
import type { AuthUser } from '@/features/auth/schemas/user.schema'
import { t } from '@/lib/i18n'
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
      toast.success(t('account:toast.profileSaved'))
      queryClient.setQueryData(sessionKeys.current(), user)
    },
    onError: (error) => toast.error(t('account:toast.profileFailed'), error),
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
        hasPassword ? t('account:toast.passwordChanged') : t('account:toast.passwordSet'),
        t('account:toast.passwordSignedOut'),
      )
      void queryClient.invalidateQueries({ queryKey: sessionKeys.all })
    },
    onError: (error) =>
      toast.error(
        hasPassword
          ? t('account:toast.passwordChangeFailed')
          : t('account:toast.passwordSetFailed'),
        error,
      ),
  })
}
