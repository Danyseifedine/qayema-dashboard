import { QUERY_ROOTS } from '@/lib/query/keys'
import type { OrderKind, OrderStatus } from '@/features/orders/schemas/order.schema'

export const orderKeys = {
  all: [QUERY_ROOTS.orders] as const,
  list: (kind: OrderKind, status: OrderStatus | null) =>
    [QUERY_ROOTS.orders, 'list', kind, status] as const,
  lists: () => [QUERY_ROOTS.orders, 'list'] as const,
  pulse: () => [QUERY_ROOTS.orders, 'pulse'] as const,
}
