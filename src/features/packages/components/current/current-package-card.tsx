import { Crown } from 'lucide-react'
import { LimitBadge } from '@/shared/components/data-display'
import type { AuthRestaurant } from '@/features/auth/schemas/user.schema'
import { cn } from '@/shared/utils/dom/cn'

export type CurrentPackageCardProps = {
  /** The package's name in the current language. */
  name: string
  isContactOnly: boolean
  /** ISO-8601, or null when the package does not expire. */
  endsAt: string | null
  limits: AuthRestaurant['limits']
  qrStudio: boolean
  className?: string
}

/**
 * What the owner has right now, and how much of it is used.
 *
 * The numbers come from the session rather than the package list, because a
 * restaurant can hold grants on top of its package that the catalog does not
 * know about.
 */
export function CurrentPackageCard({
  name,
  isContactOnly,
  endsAt,
  limits,
  qrStudio,
  className,
}: CurrentPackageCardProps) {
  const rows = [
    { label: 'Dishes', value: limits.dishes },
    { label: 'Categories', value: limits.categories },
    { label: 'Social links', value: limits.social_links },
  ]

  return (
    <section
      className={cn(
        'rounded-[14px] border-[0.5px] border-accent-border bg-accent-wash p-4 sm:p-5',
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[12px] tracking-[0.08em] text-[var(--muted)] uppercase">
            Your package
          </p>
          <h2 className="mt-1 flex items-center gap-2 font-display text-[22px] leading-tight text-accent">
            <Crown aria-hidden className="size-5" />
            {name}
          </h2>
        </div>
        {endsAt !== null ? (
          <p className="text-[12.5px] text-[var(--muted)]">
            Renews or ends on{' '}
            <span className="text-[var(--text)]">
              {new Date(endsAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </p>
        ) : isContactOnly ? (
          <p className="text-[12.5px] text-[var(--muted)]">Arranged with us directly.</p>
        ) : null}
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-2 rounded-[10px] bg-[var(--surface)] px-3 py-2.5"
          >
            <dt className="text-[13px] text-[var(--muted)]">{row.label}</dt>
            <dd>
              <LimitBadge used={row.value.used} limit={row.value.limit} />
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-3 text-[12.5px] text-[var(--muted)]">
        {qrStudio
          ? 'QR studio is included, so you can brand your code.'
          : 'QR studio is not included on this package.'}
      </p>
    </section>
  )
}
