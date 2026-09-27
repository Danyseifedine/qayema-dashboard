import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { colorsFontsKeys } from '@/features/colors-fonts/hooks/colors-fonts-keys'
import { fetchColorsFonts, saveColorsFonts } from '@/features/colors-fonts/api/colors-fonts.api'
import type { ColorsFonts } from '@/features/colors-fonts/schemas/colors-fonts.schema'
import { qrKeys } from '@/features/qr'
import { t } from '@/lib/i18n'
import { toast } from '@/shared/components/feedback'
import type { ApiError } from '@/shared/types/api'

export function useColorsFonts(): UseQueryResult<ColorsFonts, ApiError> {
  return useQuery<ColorsFonts, ApiError>({
    queryKey: colorsFontsKeys.all,
    queryFn: ({ signal }) => fetchColorsFonts(signal),
  })
}

/**
 * Saves the colours the owner changed, on Save. The QR studio's "brand" card
 * is painted with the main colour, so it is refetched too.
 */
export function useSaveColors() {
  const queryClient = useQueryClient()

  return useMutation<ColorsFonts, ApiError, Record<string, string | null>>({
    mutationFn: (colors) => saveColorsFonts({ colors }),
    onSuccess: (page) => {
      queryClient.setQueryData(colorsFontsKeys.all, page)
      void queryClient.invalidateQueries({ queryKey: qrKeys.all })
      toast.success(
        t('colors-fonts:toast.colorsSaved'),
        t('colors-fonts:toast.colorsSavedDescription'),
      )
    },
    onError: (error) => toast.error(t('colors-fonts:toast.colorsFailed'), error),
  })
}

function withFont(page: ColorsFonts | undefined, script: string, family: string) {
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
    ColorsFonts,
    ApiError,
    { script: string; family: string },
    { previous: ColorsFonts | undefined }
  >({
    mutationFn: ({ script, family }) => saveColorsFonts({ fonts: { [script]: family } }),
    onMutate: async ({ script, family }) => {
      await queryClient.cancelQueries({ queryKey: colorsFontsKeys.all })
      const previous = queryClient.getQueryData<ColorsFonts>(colorsFontsKeys.all)
      queryClient.setQueryData(colorsFontsKeys.all, withFont(previous, script, family))
      return { previous }
    },
    onSuccess: (page) => queryClient.setQueryData(colorsFontsKeys.all, page),
    onError: (error, _change, context) => {
      queryClient.setQueryData(colorsFontsKeys.all, context?.previous)
      toast.error(t('colors-fonts:toast.fontFailed'), error)
    },
  })
}
