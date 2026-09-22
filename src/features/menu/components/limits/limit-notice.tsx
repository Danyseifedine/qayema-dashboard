import { LimitBadge } from '@/shared/components/data-display'
import { cn } from '@/shared/utils/dom/cn'

export type LimitNoticeProps = {
  label: string
  used: number
  limit: number
  className?: string
}

/** Section heading with the plan usage beside it. */
export function LimitNotice({ label, used, limit, className }: LimitNoticeProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <h2 className="font-display text-[19px] leading-tight">{label}</h2>
      <LimitBadge used={used} limit={limit} />
    </div>
  )
}
