import { analyticsKeys } from '@/features/analytics'
import { sessionKeys } from '@/features/auth'
import { appearanceKeys } from '@/features/appearance'
import { categoryKeys, dishKeys } from '@/features/menu'
import { qrKeys } from '@/features/qr'
import { restaurantKeys } from '@/features/restaurant/hooks/restaurant-keys'
import type { AuthUser } from '@/features/auth'
import { saveSwitchedOff } from '@/features/restaurant/api/features.api'
import { patchRestaurant, useSessionSave } from '@/features/restaurant/hooks/use-session-save'

/**
 * The session with the new switches, and the menu's languages that follow
 * "Multiple languages" (as `MenuLanguages::for()` in ../qayema decides them),
 * so the category and dish forms drop or show the second language at once.
 */
function withOff(user: AuthUser | undefined, off: string[]): AuthUser | undefined {
  return patchRestaurant(user, (restaurant) => {
    const main = restaurant.main_locale
    const second = restaurant.second_locale
    const bilingual =
      restaurant.plan.multiple_languages && !off.includes('languages') && second !== null
    const languages = bilingual ? [main, second] : [main]

    return {
      switched_off: off,
      languages,
      default_locale: languages.includes(restaurant.default_locale)
        ? restaurant.default_locale
        : main,
    }
  })
}

/**
 * Switches optional features off and on. Optimistic: the sidebar changes on
 * the tap, from the session cache, and snaps back with an error toast if the
 * save fails, so, per convention, there is no success toast.
 */
export function useSaveSwitchedOff() {
  return useSessionSave<string[]>(saveSwitchedOff, withOff, (_off, queryClient) => {
    // The server has the last word, such as which language the menu opens
    // in once the second one is back.
    void queryClient.invalidateQueries({ queryKey: sessionKeys.current() })
    // "QR Studio" decides what the QR page shows; "Multiple languages"
    // decides which languages menu text comes back in and which scripts get
    // a font picker; "Ordering" decides whether analytics count orders. Reset
    // rather than invalidated: an invalidated page
    // opens on its old copy (still "switched off") until the refetch lands;
    // a reset one opens on its skeleton, then the fresh answer.
    for (const key of [
      analyticsKeys.all,
      qrKeys.all,
      restaurantKeys.all,
      categoryKeys.all,
      dishKeys.all,
      appearanceKeys.all,
    ]) {
      void queryClient.resetQueries({ queryKey: key })
    }
  })
}
