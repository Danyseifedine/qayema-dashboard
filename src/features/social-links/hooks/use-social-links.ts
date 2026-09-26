import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { toast } from '@/shared/components/feedback'
import type { ApiError } from '@/shared/types/api'
import {
  createSocialLink,
  deleteSocialLink,
  fetchSocialLinks,
  updateSocialLink,
} from '../api/social-link.api'
import type {
  SocialLink,
  SocialLinkFormValues,
  SocialLinkList,
} from '../schemas/social-link.schema'
import { socialLinkKeys } from './social-link-keys'

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
      toast.success(id === null ? 'Link added' : 'Link saved')
      void queryClient.invalidateQueries({ queryKey: socialLinkKeys.all })
    },
    onError: (error) =>
      toast.error(id === null ? 'Could not add that link' : 'Could not save that link', error),
  })
}

export function useDeleteSocialLink() {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError, number>({
    mutationFn: deleteSocialLink,
    onSuccess: () => {
      toast.success('Link removed', 'It no longer appears on your menu.')
      void queryClient.invalidateQueries({ queryKey: socialLinkKeys.all })
    },
    onError: (error) => toast.error('Could not remove that link', error),
  })
}
