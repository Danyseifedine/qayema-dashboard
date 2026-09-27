import { QUERY_ROOTS } from '@/lib/query/keys'

export const designKeys = {
  all: [QUERY_ROOTS.design] as const,
  list: () => [QUERY_ROOTS.design, 'list'] as const,
}
