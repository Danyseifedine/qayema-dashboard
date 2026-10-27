import { QUERY_ROOTS } from '@/lib/query/keys'

export const offerKeys = {
  all: [QUERY_ROOTS.offers] as const,
  list: () => [QUERY_ROOTS.offers, 'list'] as const,
}
