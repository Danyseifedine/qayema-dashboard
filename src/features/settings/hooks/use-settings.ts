import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { t } from '@/lib/i18n'
import { QUERY_ROOTS } from '@/lib/query/keys'
import { toast } from '@/shared/components/feedback'
import type { ApiError } from '@/shared/types/api'
import { fetchSettings, updateSettings, type SettingsPayload } from '../api/settings.api'
import type { Settings } from '../schemas/settings.schema'
import { settingsKeys } from './settings-keys'

export function useSettings(): UseQueryResult<Settings, ApiError> {
  return useQuery<Settings, ApiError>({
    queryKey: settingsKeys.detail(),
    queryFn: ({ signal }) => fetchSettings(signal),
    staleTime: 30_000,
  })
}

/**
 * Saving returns the restaurant as stored, so the cache is written from the
 * response rather than refetched. The session is invalidated as well: the
 * name and logo it carries are what the topbar and the sidebar draw.
 */
export function useSaveSettings() {
  const queryClient = useQueryClient()

  return useMutation<Settings, ApiError, SettingsPayload>({
    mutationFn: updateSettings,
    onSuccess: (saved) => {
      toast.success(t('settings:toast.savedTitle'), t('settings:toast.savedDescription'))
      queryClient.setQueryData(settingsKeys.detail(), saved)
      void queryClient.invalidateQueries({ queryKey: [QUERY_ROOTS.session] })
    },
    onError: (error) => toast.error(t('settings:toast.saveFailed'), error),
  })
}
