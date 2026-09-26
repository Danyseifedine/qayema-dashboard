import { QUERY_ROOTS } from '@/lib/query/keys'

export const socialLinkKeys = {
  all: [QUERY_ROOTS.socialLinks] as const,
  list: () => [QUERY_ROOTS.socialLinks, 'list'] as const,
}
