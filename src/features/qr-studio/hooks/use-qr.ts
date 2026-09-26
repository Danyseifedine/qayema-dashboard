import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
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
      toast.success('QR code saved', 'Your printed codes keep working — only the look changed.')
    },
    onError: (error) => toast.error('Could not save your QR code', error),
  })
}
