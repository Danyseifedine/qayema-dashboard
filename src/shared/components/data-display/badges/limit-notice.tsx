import { useTranslation } from 'react-i18next'
import { LimitBadge } from '@/shared/components/data-display'

export type LimitNoticeProps = {
  used: number
  /** Null means unlimited on this package. */
  limit: number | null
}

/**
 * How much of the package a page has used, beside its add button: "6 / 40
 * on your package". The page's name and what it is for are in its heading,
 * so this is the count alone; with no limit there is nothing to count against.
 */
export function LimitNotice({ used, limit }: LimitNoticeProps) {
  const { t } = useTranslation()
  if (limit === null) return null

  return (
    <p className="flex items-center gap-2.5 text-[13px] text-[var(--muted)]">
      <LimitBadge used={used} limit={limit} outlined />
      {t('limitNotice.onYourPackage')}
    </p>
  )
}
