import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { appearanceKeys } from '@/features/appearance/hooks/appearance-keys'
import { fetchAppearance, saveAppearance } from '@/features/appearance/api/appearance.api'
import type { Appearance } from '@/features/appearance/schemas/appearance.schema'
import { qrKeys } from '@/features/qr'
import { t } from '@/lib/i18n'
import { toast } from '@/shared/components/feedback'
import type { ApiError } from '@/shared/types/api'

export function useAppearance(): UseQueryResult<Appearance, ApiError> {
  return useQuery<Appearance, ApiError>({
    queryKey: appearanceKeys.all,
    queryFn: ({ signal }) => fetchAppearance(signal),
  })
}

/**
 * Saves the design settings the owner changed, on Save. The QR studio's
 * "brand" card is painted with the main colour, so it is refetched too.
 */
export function useSaveDesignSettings() {
  const queryClient = useQueryClient()

  return useMutation<Appearance, ApiError, Record<string, string | boolean | null>>({
    mutationFn: (settings) => saveAppearance({ settings }),
    onSuccess: (page) => {
      queryClient.setQueryData(appearanceKeys.all, page)
      void queryClient.invalidateQueries({ queryKey: qrKeys.all })
      toast.success(t('appearance:toast.saved'), t('appearance:toast.savedDescription'))
    },
    onError: (error) => toast.error(t('appearance:toast.saveFailed'), error),
  })
}

function withFont(page: Appearance | undefined, script: string, family: string) {
  return page
    ? {
        ...page,
        fonts: page.fonts.map((row) => (row.script === script ? { ...row, value: family } : row)),
      }
    : page
}

/**
 * Picks a font the moment it is tapped. Optimistic, like the Features
 * switches: the picker moves at once and snaps back with an error toast if
 * the save fails, so there is no success toast.
 */
export function useSaveFont() {
  const queryClient = useQueryClient()

  return useMutation<
    Appearance,
    ApiError,
    { script: string; family: string },
    { previous: Appearance | undefined }
  >({
    mutationFn: ({ script, family }) => saveAppearance({ fonts: { [script]: family } }),
    onMutate: async ({ script, family }) => {
      await queryClient.cancelQueries({ queryKey: appearanceKeys.all })
      const previous = queryClient.getQueryData<Appearance>(appearanceKeys.all)
      queryClient.setQueryData(appearanceKeys.all, withFont(previous, script, family))
      return { previous }
    },
    onSuccess: (page) => queryClient.setQueryData(appearanceKeys.all, page),
    onError: (error, _change, context) => {
      queryClient.setQueryData(appearanceKeys.all, context?.previous)
      toast.error(t('appearance:toast.fontFailed'), error)
    },
  })
}
