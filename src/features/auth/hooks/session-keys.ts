import { QUERY_ROOTS } from '@/lib/query/keys'

export const sessionKeys = {
  all: [QUERY_ROOTS.session] as const,
  current: () => [QUERY_ROOTS.session, 'current'] as const,
}
