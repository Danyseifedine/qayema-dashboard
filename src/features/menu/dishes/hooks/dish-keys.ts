import { QUERY_ROOTS } from '@/lib/query/keys'

/** Dish query keys. The index is one list; the category chips filter it in the client. */
export const dishKeys = {
  all: [QUERY_ROOTS.dishes] as const,
  list: () => [QUERY_ROOTS.dishes, 'list'] as const,
}
