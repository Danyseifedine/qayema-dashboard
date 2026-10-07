import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { t } from '@/lib/i18n'
import { toast } from '@/shared/components/feedback'
import type { ApiError } from '@/shared/types/api'
import {
  createTables,
  deleteTable,
  fetchTables,
  newTableCode,
  renameTable,
} from '@/features/tables/api/tables.api'
import type { DiningTable, TableList } from '@/features/tables/schemas/table.schema'
import { tableKeys } from '@/features/tables/hooks/table-keys'

export function useTables(): UseQueryResult<TableList, ApiError> {
  return useQuery<TableList, ApiError>({
    queryKey: tableKeys.list(),
    queryFn: ({ signal }) => fetchTables(signal),
    staleTime: 30_000,
  })
}

/** Errors stay in the dialog that sent them, so only success is toasted. */
export function useAddTables() {
  const queryClient = useQueryClient()

  return useMutation<DiningTable[], ApiError, string[]>({
    mutationFn: createTables,
    onSuccess: (created) => {
      toast.success(t('tables:toast.added', { count: created.length }))
      void queryClient.invalidateQueries({ queryKey: tableKeys.all })
    },
  })
}

export function useRenameTable() {
  const queryClient = useQueryClient()

  return useMutation<DiningTable, ApiError, { id: number; name: string }>({
    mutationFn: ({ id, name }) => renameTable(id, name),
    onSuccess: () => {
      toast.success(t('tables:toast.renamed'))
      void queryClient.invalidateQueries({ queryKey: tableKeys.all })
    },
  })
}

export function useNewTableCode() {
  const queryClient = useQueryClient()

  return useMutation<DiningTable, ApiError, number>({
    mutationFn: newTableCode,
    onSuccess: (table) => {
      toast.success(t('tables:toast.newCode', { name: table.name }), t('tables:toast.newCodeHint'))
      void queryClient.invalidateQueries({ queryKey: tableKeys.all })
    },
    onError: (error) => toast.error(t('tables:toast.newCodeFailed'), error),
  })
}

export function useDeleteTable() {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError, number>({
    mutationFn: deleteTable,
    onSuccess: () => {
      toast.success(t('tables:toast.removed'))
      void queryClient.invalidateQueries({ queryKey: tableKeys.all })
    },
    onError: (error) => toast.error(t('tables:toast.removeFailed'), error),
  })
}
