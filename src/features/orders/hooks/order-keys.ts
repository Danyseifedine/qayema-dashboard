import { QUERY_ROOTS } from '@/lib/query/keys'
import type { OrderStatus } from '../schemas/order.schema'

export const orderKeys = {
  all: [QUERY_ROOTS.orders] as const,
  list: (status: OrderStatus | null) => [QUERY_ROOTS.orders, 'list', status] as const,
}
