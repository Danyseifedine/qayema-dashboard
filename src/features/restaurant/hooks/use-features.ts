import { useMutation, useQueryClient } from '@tanstack/react-query'
import { sessionKeys } from '@/features/auth'
import { appearanceKeys } from '@/features/appearance'
import { categoryKeys, dishKeys } from '@/features/menu'
import { qrKeys } from '@/features/qr'
import { restaurantKeys } from '@/features/restaurant/hooks/restaurant-keys'
import type { AuthUser } from '@/features/auth'
import { t } from '@/lib/i18n'
import { toast } from '@/shared/components/feedback'
import { MAIN_LANGUAGE } from '@/shared/constants/menu-languages'
import type { ApiError } from '@/shared/types/api'
import { saveSwitchedOff } from '@/features/restaurant/api/features.api'

/**
 * The session with the new switches, and the menu's languages that follow
 * "Multiple languages" (as `MenuLanguages::for()` in ../qayema decides them),
 * so the category and dish forms drop or show the second language at once.
 */
function withOff(user: AuthUser | undefined, off: string[]): AuthUser | undefined {
  if (!user?.restaurant) return user

  const { restaurant } = user
  const second = restaurant.second_locale
  const bilingual =
    restaurant.plan.multiple_languages && !off.includes('languages') && second !== null
  const languages = bilingual ? [MAIN_LANGUAGE, second] : [MAIN_LANGUAGE]

  return {
    ...user,
    restaurant: {
      ...restaurant,
      switched_off: off,
      languages,
      default_locale: languages.includes(restaurant.default_locale)
        ? restaurant.default_locale
        : MAIN_LANGUAGE,
    },
  }
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
      // The server has the last word, such as which language the menu opens
      // in once the second one is back.
      void queryClient.invalidateQueries({ queryKey: sessionKeys.current() })
      // "QR Studio" decides what the QR page shows; "Multiple languages"
      // decides which languages menu text comes back in and which scripts get
      // a font picker. Reset rather than invalidated: an invalidated page
      // opens on its old copy (still "switched off") until the refetch lands;
      // a reset one opens on its skeleton, then the fresh answer.
      for (const key of [
        qrKeys.all,
        restaurantKeys.all,
        categoryKeys.all,
        dishKeys.all,
        appearanceKeys.all,
      ]) {
        void queryClient.resetQueries({ queryKey: key })
      }
    },
    onError: (error, _off, context) => {
      queryClient.setQueryData(sessionKeys.current(), context?.previous)
      toast.error(t('features:saveFailed'), error)
    },
  })
}
