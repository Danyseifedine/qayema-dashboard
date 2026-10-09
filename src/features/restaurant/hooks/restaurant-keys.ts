import { QUERY_ROOTS } from '@/lib/query/keys'

export const restaurantKeys = {
  all: [QUERY_ROOTS.restaurant] as const,
  detail: () => [QUERY_ROOTS.restaurant, 'detail'] as const,
  languages: () => [QUERY_ROOTS.restaurant, 'languages'] as const,
}
