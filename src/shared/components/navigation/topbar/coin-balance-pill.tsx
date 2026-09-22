import { Coins } from 'lucide-react'
import { cn } from '@/shared/utils/dom/cn'

export type CoinBalancePillProps = {
  balance: number
  onClick?: () => void
  className?: string
}

/**
 * The owner's coin balance, always visible because every paid action in the
 * product is priced in coins. Clicking it goes to the wallet.
 */
export function CoinBalancePill({ balance, onClick, className }: CoinBalancePillProps) {
  // One formatting of the number, so the label and the visible text agree.
  const formatted = balance.toLocaleString()

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${formatted} coins. Open wallet.`}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-[var(--radius-control)] border-[0.5px] px-3 py-1.5',
        'border-accent-border bg-accent-wash text-[12.5px] font-medium text-accent',
        'transition-colors duration-200 hover:bg-accent-wash-hover',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-on)]',
        className,
      )}
    >
      <Coins aria-hidden className="size-3.5" />
      <span className="tabular-nums">{formatted}</span>
    </button>
  )
}
