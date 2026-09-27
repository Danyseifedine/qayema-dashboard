import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { t } from '@/lib/i18n'
import { toast } from '@/shared/components/feedback'
import type { ApiError } from '@/shared/types/api'
import { fetchQr, saveQr } from '../api/qr.api'
import type { Qr, QrDesign } from '../schemas/qr.schema'
import { qrKeys } from './qr-keys'

export function useQr(): UseQueryResult<Qr, ApiError> {
  return useQuery<Qr, ApiError>({
    queryKey: qrKeys.all,
    queryFn: ({ signal }) => fetchQr(signal),
  })
}

/** Saves the design and puts the server's answer straight into the cache. */
export function useSaveQr() {
  const queryClient = useQueryClient()

  return useMutation<Qr, ApiError, QrDesign>({
    mutationFn: saveQr,
    onSuccess: (qr) => {
      queryClient.setQueryData(qrKeys.all, qr)
      toast.success(t('qr:toast.saved'), t('qr:toast.savedDescription'))
    },
    onError: (error) => toast.error(t('qr:toast.saveFailed'), error),
  })
}
