import { IconToolsKitchen2 } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/utils/dom/cn'
import { formatMoney } from '@/shared/utils/format/money'

export type DealSummaryProps = {
  /** In the menu's language. */
  name: string
  price: number
  /** The currency it is priced in. */
  currency: string
  photoUrl: string | null
  className?: string
}

/**
 * An offer's deal dish in a line, on its card and in the editor's review:
 * its photo (a dish icon without one) and "Deal: Family meal, $25.00".
 */
export function DealSummary({ name, price, currency, photoUrl, className }: DealSummaryProps) {
  const { t } = useTranslation('offers')

  return (
    <span className={cn('flex items-center gap-2', className)}>
      <span className="inset-tile grid size-8 shrink-0 place-items-center overflow-hidden rounded-tile">
        {photoUrl ? (
          <img src={photoUrl} alt="" className="size-full object-cover" loading="lazy" />
        ) : (
          <IconToolsKitchen2 aria-hidden className="size-4 text-[var(--muted)]" stroke={1.6} />
        )}
      </span>
      <span dir="auto" className="min-w-0 [overflow-wrap:anywhere]">
        {t('card.deal', { name, price: formatMoney(price, currency) })}
      </span>
    </span>
  )
}
