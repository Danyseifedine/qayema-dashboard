import { QUERY_ROOTS } from '@/lib/query/keys'

/**
 * Every categories query key comes from here, so invalidating by prefix after
 * a create, rename, delete or reorder cannot miss a hand-written array.
 */
export const categoryKeys = {
  all: [QUERY_ROOTS.categories] as const,
  list: () => [QUERY_ROOTS.categories, 'list'] as const,
  detail: (id: number) => [QUERY_ROOTS.categories, 'detail', id] as const,
}
