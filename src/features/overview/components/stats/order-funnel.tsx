import type { AdvancedStats } from '../../schemas/stats.schema'

export type OrderFunnelProps = {
  funnel: NonNullable<AdvancedStats['funnel']>
}

/**
 * From opening the menu to ordering. Each step says what share of the
 * visitors got that far.
 */
export function OrderFunnel({ funnel }: OrderFunnelProps) {
  const steps = [
    { label: 'Opened the menu', value: funnel.visitors },
    { label: 'Added something to the cart', value: funnel.carted },
    { label: 'Placed an order', value: funnel.ordered },
  ]

  return (
    <ol className="flex flex-col gap-3" aria-label="From visit to order">
      {steps.map((step) => {
        const share = funnel.visitors > 0 ? Math.min(step.value / funnel.visitors, 1) : 0
        return (
          <li key={step.label} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3 text-[13px]">
              <span>{step.label}</span>
              <span className="shrink-0 tabular-nums">
                <span className="me-2 text-[12px] text-[var(--muted)]">
                  {Math.round(share * 100)}%
                </span>
                <span className="font-semibold">{step.value.toLocaleString()}</span>
              </span>
            </div>
            <div aria-hidden className="h-2 overflow-hidden rounded-full bg-[var(--hover-wash)]">
              <div
                className="h-full rounded-full bg-[var(--status-success)] transition-[width] duration-500"
                style={{ width: `${share * 100}%` }}
              />
            </div>
          </li>
        )
      })}
    </ol>
  )
}
