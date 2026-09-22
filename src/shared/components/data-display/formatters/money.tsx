import { formatMoney } from '@/shared/utils/format/money'
import { cn } from '@/shared/utils/dom/cn'

export type MoneyProps = {
  amount: number
  currency: string
  locale?: string
  className?: string
}

/** A price, kept left-to-right and tabular in both languages. */
export function Money({ amount, currency, locale, className }: MoneyProps) {
  return (
    <span dir="ltr" className={cn('tabular-nums', className)}>
      {formatMoney(amount, currency, locale)}
    </span>
  )
}
