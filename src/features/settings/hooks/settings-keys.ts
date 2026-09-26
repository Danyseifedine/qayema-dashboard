import { QUERY_ROOTS } from '@/lib/query/keys'

export const settingsKeys = {
  all: [QUERY_ROOTS.settings] as const,
  detail: () => [QUERY_ROOTS.settings, 'detail'] as const,
}
