import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { t } from '@/lib/i18n'
import { toast } from '@/shared/components/feedback'
import type { ApiError } from '@/shared/types/api'
import {
  createSocialLink,
  deleteSocialLink,
  fetchSocialLinks,
  updateSocialLink,
} from '@/features/social-links/api/social-link.api'
import type {
  SocialLink,
  SocialLinkFormValues,
  SocialLinkList,
} from '@/features/social-links/schemas/social-link.schema'
import { socialLinkKeys } from '@/features/social-links/hooks/social-link-keys'

/**
 * Every social link for the restaurant. There are at most four — one per
 * platform — so this is never paginated or filtered.
 */
export function useSocialLinks(): UseQueryResult<SocialLinkList, ApiError> {
  return useQuery<SocialLinkList, ApiError>({
    queryKey: socialLinkKeys.list(),
    queryFn: ({ signal }) => fetchSocialLinks(signal),
    staleTime: 30_000,
  })
}

/** Add or edit. The list carries the usage meta, so it is invalidated either way. */
export function useSaveSocialLink(id: number | null) {
  const queryClient = useQueryClient()

  return useMutation<SocialLink, ApiError, SocialLinkFormValues>({
    mutationFn: (payload) =>
      id === null ? createSocialLink(payload) : updateSocialLink(id, payload),
    onSuccess: () => {
      toast.success(id === null ? t('social-links:toast.added') : t('social-links:toast.saved'))
      void queryClient.invalidateQueries({ queryKey: socialLinkKeys.all })
    },
    onError: (error) =>
      toast.error(
        id === null ? t('social-links:toast.addFailed') : t('social-links:toast.saveFailed'),
        error,
      ),
  })
}

export function useDeleteSocialLink() {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError, number>({
    mutationFn: deleteSocialLink,
    onSuccess: () => {
      toast.success(t('social-links:toast.removed'), t('social-links:toast.removedDescription'))
      void queryClient.invalidateQueries({ queryKey: socialLinkKeys.all })
    },
    onError: (error) => toast.error(t('social-links:toast.removeFailed'), error),
  })
}
