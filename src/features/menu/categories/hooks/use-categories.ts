import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { toast } from '@/shared/components/feedback'
import type { ApiError } from '@/shared/types/api'
import {
  createCategory,
  deleteCategory,
  reorderCategories,
  updateCategory,
  type CategoryPayload,
} from '../api/category.api'
import { fetchCategories } from '../api/category.api'
import type { Category, CategoryList } from '../schemas/category.schema'
import { categoryKeys } from './category-keys'

/**
 * Every category for the restaurant. Both menu pages read this, so the stale
 * window stops a refetch each time the owner steps between them.
 */
export function useCategories(): UseQueryResult<CategoryList, ApiError> {
  return useQuery<CategoryList, ApiError>({
    queryKey: categoryKeys.list(),
    queryFn: ({ signal }) => fetchCategories(signal),
    staleTime: 30_000,
  })
}

/** Creating or renaming both invalidate the list, which carries the usage meta. */
export function useSaveCategory(id: number | null) {
  const queryClient = useQueryClient()

  return useMutation<Category, ApiError, CategoryPayload>({
    mutationFn: (payload) => (id === null ? createCategory(payload) : updateCategory(id, payload)),
    onSuccess: () => {
      toast.success(id === null ? 'Category added' : 'Category renamed')
      void queryClient.invalidateQueries({ queryKey: categoryKeys.all })
    },
    onError: (error) => {
      // A 422 also lands on the field; the toast makes sure a failure is
      // noticed even when the offending field is scrolled out of view.
      toast.error(
        id === null ? 'Could not add that category' : 'Could not rename that category',
        error,
      )
    },
  })
}

/**
 * Deleting a category does not delete its dishes; they are left without one.
 * The dish list is therefore invalidated too.
 */
export function useDeleteCategory() {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError, number>({
    mutationFn: deleteCategory,
    onSuccess: () => {
      toast.success('Category deleted', 'Its dishes were kept and now have no category.')
      void queryClient.invalidateQueries({ queryKey: categoryKeys.all })
      void queryClient.invalidateQueries({ queryKey: ['dishes'] })
    },
    onError: (error) => toast.error('Could not delete that category', error),
  })
}

/**
 * Reorder, applied optimistically.
 *
 * Dragging must feel immediate, so the cache is rewritten before the request
 * goes out and rolled back if the server refuses.
 */
export function useReorderCategories() {
  const queryClient = useQueryClient()

  return useMutation<Category[], ApiError, Category[], { previous?: CategoryList }>({
    mutationFn: (ordered) => reorderCategories(ordered.map((category) => category.id)),

    onMutate: async (ordered) => {
      await queryClient.cancelQueries({ queryKey: categoryKeys.list() })
      const previous = queryClient.getQueryData<CategoryList>(categoryKeys.list())

      if (previous) {
        queryClient.setQueryData<CategoryList>(categoryKeys.list(), {
          ...previous,
          data: ordered.map((category, index) => ({ ...category, display_order: index + 1 })),
        })
      }

      return { previous }
    },

    // The reordered list comes back in full, so it replaces the optimistic
    // one directly instead of costing a second round trip.
    onSuccess: (ordered) => {
      queryClient.setQueryData<CategoryList>(categoryKeys.list(), (current) =>
        current === undefined ? current : { ...current, data: ordered },
      )
    },

    onError: (error, _ordered, context) => {
      if (context?.previous) {
        queryClient.setQueryData(categoryKeys.list(), context.previous)
      }
      // The cards visibly snap back, so say why. There is no success toast
      // here: the new order on screen is the confirmation.
      toast.error('Could not save the new order', error)
      void queryClient.invalidateQueries({ queryKey: categoryKeys.all })
    },
  })
}
