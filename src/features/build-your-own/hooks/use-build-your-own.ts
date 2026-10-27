import { useMutation, useQueryClient } from '@tanstack/react-query'
import { sessionKeys } from '@/features/auth'
import { categoryKeys, dishKeys } from '@/features/menu'
import { t } from '@/lib/i18n'
import { toast } from '@/shared/components/feedback'
import type { ApiError } from '@/shared/types/api'
import {
  createBuiltDish,
  saveDishBuilds,
  updateBuiltDish,
  type BuiltDishPayload,
} from '@/features/build-your-own/api/build-your-own.api'
import type { BuildPayload } from '@/features/build-your-own/schemas/build.schema'

/**
 * A build saved with its dish: a new one makes the dish (`dishId` null), a
 * saved one changes it. The dishes, the categories' counts and the
 * session's dish counts and photos (Home) are read again, as a dish save
 * does.
 */
export function useSaveBuiltDish(dishId: number | null) {
  const queryClient = useQueryClient()

  return useMutation<number, ApiError, BuiltDishPayload>({
    mutationFn: (payload) =>
      dishId === null ? createBuiltDish(payload) : updateBuiltDish(dishId, payload),
    onSuccess: (_id, payload) => {
      toast.success(
        t(dishId === null ? 'build-your-own:toast.added' : 'build-your-own:toast.saved'),
      )
      void queryClient.invalidateQueries({ queryKey: dishKeys.all })
      void queryClient.invalidateQueries({ queryKey: categoryKeys.all })
      if (dishId === null || payload.delete_image === true) {
        void queryClient.invalidateQueries({ queryKey: sessionKeys.current() })
      }
    },
    onError: (error) => toast.error(t('build-your-own:toast.saveFailed'), error),
  })
}

/** One of a dish's builds deleted: its others saved as they are. */
export function useRemoveBuild() {
  const queryClient = useQueryClient()

  return useMutation<number, ApiError, { dishId: number; builds: BuildPayload[] }>({
    mutationFn: ({ dishId, builds }) => saveDishBuilds(dishId, builds),
    onSuccess: () => {
      toast.success(t('build-your-own:toast.removed'))
      void queryClient.invalidateQueries({ queryKey: dishKeys.all })
    },
    onError: (error) => toast.error(t('build-your-own:toast.removeFailed'), error),
  })
}
