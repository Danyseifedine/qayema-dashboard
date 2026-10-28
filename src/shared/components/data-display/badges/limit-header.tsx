import type { ReactNode } from 'react'
import {
  LimitNotice,
  type LimitNoticeProps,
} from '@/shared/components/data-display/badges/limit-notice'
import { Skeleton } from '@/shared/components/feedback/skeletons/skeleton'

/**
 * The row above a list the package caps (categories, dishes, links): how
 * many are used of how many, and the Add button at the end. With no cap,
 * the button alone; while the count loads, a placeholder where it will be.
 */
export function LimitHeader({
  used,
  limit,
  loading = false,
  setBy,
  action,
}: {
  used: number
  limit: number | null
  loading?: boolean
  setBy?: LimitNoticeProps['setBy']
  action: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {loading ? (
        <Skeleton className="h-8 w-40 rounded-full" />
      ) : (
        <LimitNotice used={used} limit={limit} setBy={setBy} />
      )}
      <div className="ms-auto">{action}</div>
    </div>
  )
}
