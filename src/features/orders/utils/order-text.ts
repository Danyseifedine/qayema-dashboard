import type { Order, OrderStatus } from '@/features/orders/schemas/order.schema'

type StatusLabelKey =
  `status.${OrderStatus}` | 'status.onItsWay' | 'status.preparing' | 'status.served'

/**
 * An order's status in words, the same on its card, in the filter and in
 * the toast. "Ready" is "On its way" for a delivery. At a table an order
 * goes new, preparing, served: "Accepted" reads "Preparing" and "Done"
 * reads "Served" (one moved to ready before reads as preparing still).
 */
export function statusLabel({
  status,
  fulfilment,
}: Pick<Order, 'status' | 'fulfilment'>): StatusLabelKey {
  if (fulfilment === 'dine_in') {
    if (status === 'accepted' || status === 'ready') return 'status.preparing'
    if (status === 'done') return 'status.served'
  }
  if (status === 'ready' && fulfilment === 'delivery') return 'status.onItsWay'
  return `status.${status}`
}

/**
 * What the guest chose on a line, as its card says it: "Size: Large" for
 * each variant, "Your pizza: ½ Margherita + ½ Pepperoni" for each build,
 * "+ Extra cheese" for each add-on, to join with " · ". The server's
 * `OrderItem::choices()`, in its order.
 */
export function choiceParts(
  variants: readonly { name: string; choice: string }[],
  addons: readonly { name: string }[],
  builds: readonly BuiltParts[] = [],
): string[] {
  return [
    ...variants.map((variant) => `${variant.name}: ${variant.choice}`),
    ...builds.map((build) => `${build.name}: ${builtText(build.parts)}`),
    ...addons.map((addon) => `+ ${addon.name}`),
  ]
}

/** A build as `choiceParts` reads it: its name and each part's choice. */
export type BuiltParts = { name: string; parts: readonly { choice: string; share: number }[] }

/** One part of N as a fraction, the server's characters; else "1/N". */
const FRACTIONS: Record<number, string> = { 2: '½', 3: '⅓', 4: '¼', 5: '⅕', 6: '⅙', 8: '⅛' }

/**
 * A build's parts as read aloud, the twin of `OrderItem::built()`: "½
 * Margherita + ½ Pepperoni" for a pizza split in two, "Margherita" whole,
 * "2 × Vanilla, Chocolate" for scoops (each choice counted once, in the
 * order first picked).
 */
export function builtText(parts: BuiltParts['parts']): string {
  const share = parts[0]?.share ?? 1
  if (share > 1) {
    const fraction = FRACTIONS[share] ?? `1/${share}`
    return parts.map((part) => `${fraction} ${part.choice}`).join(' + ')
  }
  const counted = new Map<string, number>()
  for (const part of parts) counted.set(part.choice, (counted.get(part.choice) ?? 0) + 1)
  return [...counted]
    .map(([choice, count]) => (count > 1 ? `${count} × ${choice}` : choice))
    .join(', ')
}
