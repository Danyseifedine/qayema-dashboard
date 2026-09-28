import { QUERY_ROOTS } from '@/lib/query/keys'

export const packageKeys = {
  list: () => [QUERY_ROOTS.package, 'list'] as const,
}
