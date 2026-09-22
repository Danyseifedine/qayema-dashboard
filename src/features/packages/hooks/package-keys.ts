import { QUERY_ROOTS } from '@/lib/query/keys'

export const packageKeys = {
  all: [QUERY_ROOTS.packages] as const,
  list: () => [QUERY_ROOTS.packages, 'list'] as const,
}
