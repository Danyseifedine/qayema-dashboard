import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { t } from '@/lib/i18n'
import { sessionKeys } from '@/features/auth'
import { appearanceKeys } from '@/features/appearance'
import { designKeys } from '@/features/design/hooks/design-keys'
import { qrKeys } from '@/features/qr'
import { toast } from '@/shared/components/feedback'
import type { ApiError } from '@/shared/types/api'
import { fetchDesigns, selectDesign } from '@/features/design/api/design.api'
import type { DesignList } from '@/features/design/schemas/design.schema'

export function useDesigns(): UseQueryResult<DesignList, ApiError> {
  return useQuery<DesignList, ApiError>({
    queryKey: designKeys.list(),
    queryFn: ({ signal }) => fetchDesigns(signal),
  })
}

/**
 * Choosing a design unlocks the rest of the dashboard, so the session is
 * refetched too: `restaurant.template_id` is what the navigation gates on.
 * The settings belong to the design, so Appearance and the QR "brand" card
 * change with it.
 */
export function useSelectDesign() {
  const queryClient = useQueryClient()

  return useMutation<DesignList, ApiError, number>({
    mutationFn: selectDesign,
    onSuccess: (list) => {
      toast.success(t('design:toast.applied'), t('design:toast.appliedDescription'))
      queryClient.setQueryData(designKeys.list(), list)
      void queryClient.invalidateQueries({ queryKey: sessionKeys.all })
      void queryClient.invalidateQueries({ queryKey: appearanceKeys.all })
      void queryClient.invalidateQueries({ queryKey: qrKeys.all })
    },
    onError: (error) => toast.error(t('design:toast.switchFailed'), error),
  })
}
