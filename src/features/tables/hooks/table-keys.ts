import { QUERY_ROOTS } from '@/lib/query/keys'

export const tableKeys = {
  all: [QUERY_ROOTS.tables] as const,
  list: () => [QUERY_ROOTS.tables, 'list'] as const,
}
