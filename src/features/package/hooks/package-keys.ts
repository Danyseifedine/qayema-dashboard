import { QUERY_ROOTS } from '@/lib/query/keys'

export const packageKeys = {
  all: [QUERY_ROOTS.package] as const,
  list: () => [QUERY_ROOTS.package, 'list'] as const,
}
