import { QUERY_ROOTS } from '@/lib/query/keys'

export const designKeys = {
  list: () => [QUERY_ROOTS.design, 'list'] as const,
}
