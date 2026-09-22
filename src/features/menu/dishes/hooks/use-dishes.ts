import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { categoryKeys } from '../../categories/hooks/category-keys'
import { toast } from '@/shared/components/feedback'
import type { ApiError } from '@/shared/types/api'
import {
  createDish,
  deleteDish,
  fetchDishes,
  moveDish,
  reorderDishes,
  setDishAvailability,
  updateDish,
  type DishPayload,
} from '../api/dish.api'
import type { Dish, DishList } from '../schemas/dish.schema'
import { dishKeys } from './dish-keys'

/**
 * Every dish for the restaurant, in one request.
 *
 * The API offers no category filter and no pagination, so the whole set is
 * cached once and the category tabs filter it in memory.
 */
export function useDishes(): UseQueryResult<DishList, ApiError> {
  return useQuery<DishList, ApiError>({
    queryKey: dishKeys.lists(),
    queryFn: ({ signal }) => fetchDishes(signal),
  })
}

export function useSaveDish(id: number | null) {
  const queryClient = useQueryClient()

  return useMutation<Dish, ApiError, DishPayload>({
    mutationFn: (payload) => (id === null ? createDish(payload) : updateDish(id, payload)),
    onSuccess: () => {
      toast.success(id === null ? 'Dish added' : 'Dish saved')
      void queryClient.invalidateQueries({ queryKey: dishKeys.all })
      // A new dish changes the category's dish count.
      void queryClient.invalidateQueries({ queryKey: categoryKeys.all })
    },
    onError: (error) =>
      toast.error(id === null ? 'Could not add that dish' : 'Could not save that dish', error),
  })
}

export function useDeleteDish() {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError, number>({
    mutationFn: deleteDish,
    onSuccess: () => {
      toast.success('Dish deleted')
      void queryClient.invalidateQueries({ queryKey: dishKeys.all })
      void queryClient.invalidateQueries({ queryKey: categoryKeys.all })
    },
    onError: (error) => toast.error('Could not delete that dish', error),
  })
}

/**
 * Availability toggle, applied optimistically: the switch has to move under
 * the finger, not after a round trip.
 */
export function useDishAvailability() {
  const queryClient = useQueryClient()

  return useMutation<Dish, ApiError, { id: number; isAvailable: boolean }, { previous?: DishList }>(
    {
      mutationFn: ({ id, isAvailable }) => setDishAvailability(id, isAvailable),

      onMutate: async ({ id, isAvailable }) => {
        await queryClient.cancelQueries({ queryKey: dishKeys.lists() })
        const previous = queryClient.getQueryData<DishList>(dishKeys.lists())

        if (previous) {
          queryClient.setQueryData<DishList>(dishKeys.lists(), {
            ...previous,
            data: previous.data.map((dish) =>
              dish.id === id ? { ...dish, is_available: isAvailable } : dish,
            ),
          })
        }

        return { previous }
      },

      onError: (_error, _variables, context) => {
        if (context?.previous) queryClient.setQueryData(dishKeys.lists(), context.previous)
      },

      onSettled: () => {
        void queryClient.invalidateQueries({ queryKey: dishKeys.lists() })
      },
    },
  )
}

/** Reorder within the current view, applied optimistically. */
export function useReorderDishes() {
  const queryClient = useQueryClient()

  return useMutation<Dish[], ApiError, Dish[], { previous?: DishList }>({
    mutationFn: (ordered) => reorderDishes(ordered.map((dish) => dish.id)),

    onMutate: async (ordered) => {
      await queryClient.cancelQueries({ queryKey: dishKeys.lists() })
      const previous = queryClient.getQueryData<DishList>(dishKeys.lists())

      if (previous) {
        const position = new Map(ordered.map((dish, index) => [dish.id, index]))
        // Only the dragged subset was reordered; everything else keeps its
        // place, so sort the full list by the new positions where known.
        const sorted = [...previous.data].sort((a, b) => {
          const left = position.get(a.id)
          const right = position.get(b.id)
          if (left === undefined || right === undefined) return 0
          return left - right
        })

        queryClient.setQueryData<DishList>(dishKeys.lists(), { ...previous, data: sorted })
      }

      return { previous }
    },

    onError: (error, _ordered, context) => {
      if (context?.previous) queryClient.setQueryData(dishKeys.lists(), context.previous)
      toast.error('Could not save the new order', error)
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: dishKeys.lists() })
    },
  })
}

/** Moves a dish into another category. Position is 1-based; omitted means last. */
export function useMoveDish() {
  const queryClient = useQueryClient()

  return useMutation<Dish, ApiError, { id: number; categoryId: number; position?: number }>({
    mutationFn: ({ id, categoryId, position }) => moveDish(id, categoryId, position),
    onSuccess: () => {
      toast.success('Dish moved')
      void queryClient.invalidateQueries({ queryKey: dishKeys.all })
      void queryClient.invalidateQueries({ queryKey: categoryKeys.all })
    },
    onError: (error) => toast.error('Could not move that dish', error),
  })
}
