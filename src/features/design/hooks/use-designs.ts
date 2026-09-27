import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { t } from '@/lib/i18n'
import { sessionKeys } from '@/features/auth'
import { designKeys } from '@/features/design/hooks/design-keys'
import { qrKeys } from '@/features/qr'
import { toast } from '@/shared/components/feedback'
import type { ApiError } from '@/shared/types/api'
import { fetchDesigns, saveDesignSettings, selectDesign } from '@/features/design/api/design.api'
import type { DesignList, DesignSettings } from '@/features/design/schemas/design.schema'

export function useDesigns(): UseQueryResult<DesignList, ApiError> {
  return useQuery<DesignList, ApiError>({
    queryKey: designKeys.list(),
    queryFn: ({ signal }) => fetchDesigns(signal),
  })
}

/**
 * Choosing a design unlocks the rest of the dashboard, so the session is
 * refetched too: `restaurant.template_id` is what the navigation gates on.
 */
export function useSelectDesign() {
  const queryClient = useQueryClient()

  return useMutation<DesignList, ApiError, number>({
    mutationFn: selectDesign,
    onSuccess: (list) => {
      toast.success(t('design:toast.applied'), t('design:toast.appliedDescription'))
      queryClient.setQueryData(designKeys.list(), list)
      void queryClient.invalidateQueries({ queryKey: sessionKeys.all })
    },
    onError: (error) => toast.error(t('design:toast.switchFailed'), error),
  })
}

/**
 * Saves the active design's settings and puts the answer straight into the
 * list's cache. The QR card's "brand" colour follows the menu's, so the QR
 * studio is refetched too.
 */
export function useSaveDesignSettings() {
  const queryClient = useQueryClient()

  return useMutation<DesignSettings, ApiError, DesignSettings>({
    mutationFn: saveDesignSettings,
    onSuccess: (settings) => {
      toast.success(t('design:toast.colorSaved'), t('design:toast.colorSavedDescription'))
      queryClient.setQueryData<DesignList>(designKeys.list(), (list) =>
        list ? { ...list, meta: { ...list.meta, settings } } : list,
      )
      void queryClient.invalidateQueries({ queryKey: qrKeys.all })
    },
    onError: (error) => toast.error(t('design:toast.colorFailed'), error),
  })
}
