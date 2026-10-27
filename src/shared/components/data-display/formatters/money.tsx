import { formatMoney } from '@/shared/utils/format/money'
import { cn } from '@/shared/utils/dom/cn'

export type MoneyProps = {
  amount: number
  currency: string
  /** Before the amount, e.g. "+" on an add-on's price. */
  prefix?: string
  className?: string
}

/** A price, kept left-to-right and tabular in both languages. */
export function Money({ amount, currency, prefix, className }: MoneyProps) {
  return (
    <span dir="ltr" className={cn('tabular-nums', className)}>
      {prefix}
      {formatMoney(amount, currency)}
    </span>
  )
}
