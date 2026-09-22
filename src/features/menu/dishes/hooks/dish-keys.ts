import { QUERY_ROOTS } from '@/lib/query/keys'

/** Dish query keys. `list` takes the category filter so each tab caches apart. */
export const dishKeys = {
  all: [QUERY_ROOTS.dishes] as const,
  lists: () => [QUERY_ROOTS.dishes, 'list'] as const,
  list: (categoryId: number | null) => [QUERY_ROOTS.dishes, 'list', categoryId] as const,
  detail: (id: number) => [QUERY_ROOTS.dishes, 'detail', id] as const,
}
