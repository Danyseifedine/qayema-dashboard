import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { QUERY_ROOTS } from '@/lib/query/keys'
import { toast } from '@/shared/components/feedback'
import type { ApiError } from '@/shared/types/api'
import { fetchTemplates, selectTemplate, unlockTemplate } from '../api/template.api'
import type { TemplateList } from '../schemas/template.schema'

export const templateKeys = {
  all: [QUERY_ROOTS.templates] as const,
  list: () => [QUERY_ROOTS.templates, 'list'] as const,
}

export function useTemplates(): UseQueryResult<TemplateList, ApiError> {
  return useQuery<TemplateList, ApiError>({
    queryKey: templateKeys.list(),
    queryFn: ({ signal }) => fetchTemplates(signal),
  })
}

/**
 * Choosing a design unlocks the rest of the dashboard, so the session is
 * refetched too: `restaurant.template_id` is what the navigation gates on.
 */
export function useSelectTemplate() {
  const queryClient = useQueryClient()

  return useMutation<TemplateList, ApiError, number>({
    mutationFn: selectTemplate,
    onSuccess: (list) => {
      toast.success('Design applied', 'Your menu now uses this design.')
      queryClient.setQueryData(templateKeys.list(), list)
      void queryClient.invalidateQueries({ queryKey: [QUERY_ROOTS.session] })
    },
    onError: (error) => toast.error('Could not switch design', error),
  })
}

export function useUnlockTemplate() {
  const queryClient = useQueryClient()

  return useMutation<TemplateList, ApiError, number>({
    mutationFn: unlockTemplate,
    onSuccess: (list) => {
      toast.success('Design unlocked', 'It is yours for good, so switching back is free.')
      queryClient.setQueryData(templateKeys.list(), list)
      // Coins were spent, so the balance in the topbar is stale.
      void queryClient.invalidateQueries({ queryKey: [QUERY_ROOTS.session] })
      void queryClient.invalidateQueries({ queryKey: [QUERY_ROOTS.wallet] })
    },
    // A 402 is shown in place with a link to buy coins, so it needs no toast.
    onError: (error) => {
      if (!error.isPaymentRequired) toast.error('Could not unlock that design', error)
    },
  })
}
