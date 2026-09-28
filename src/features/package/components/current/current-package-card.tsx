import { Check, Crown, Lock } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import type { AuthRestaurant } from '@/features/auth'
import { LimitBadge } from '@/shared/components/data-display'
import { Alert, Button } from '@/shared/components/ui'
import type { Locale } from '@/shared/constants/locales'
import { cn } from '@/shared/utils/dom/cn'
import { formatDate } from '@/shared/utils/format/date'
import { translated, type TranslatableValue } from '@/shared/utils/string/translated'
import { PACKAGE_ROWS } from '@/features/package/utils/package-rows'

/** How close to its end the card turns to a warning, in days. */
const ENDING_SOON_DAYS = 7

export type CurrentPackageCardProps = {
  restaurant: AuthRestaurant
  locale: Locale
  /** True for the package every restaurant starts on. */
  isDefault: boolean
  /** Ask for a package again, by slug: the one ending, or the one that ended. */
  onAskFor: (slug: string) => void
}

/**
 * What the owner has right now, until when, and how much of it is used.
 *
 * Everything comes from the session rather than the package list, because a
 * restaurant can hold grants on top of its package that the catalogue does
 * not know about.
 */
export function CurrentPackageCard({
  restaurant,
  locale,
  isDefault,
  onAskFor,
}: CurrentPackageCardProps) {
  const { t } = useTranslation('package')
  const { package: pkg, lapsed, upcoming, limits, plan } = restaurant
  const nameOf = (value: TranslatableValue, slug: string | null) => {
    const name = translated(value, locale)
    return name.missing ? (slug ?? t('page.fallbackName')) : name.text
  }
  const name = nameOf(pkg.name, pkg.slug)
  const endingSoon = pkg.days_left !== null && pkg.days_left <= ENDING_SOON_DAYS

  const limitRows = [
    { id: 'dishes', label: t('current.dishes'), value: limits.dishes },
    { id: 'categories', label: t('current.categories'), value: limits.categories },
    { id: 'social_links', label: t('current.socialLinks'), value: limits.social_links },
  ]

  return (
    <section className="flex flex-col gap-4 rounded-[14px] border-[0.5px] border-accent-border bg-accent-wash p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[12px] tracking-[0.08em] text-[var(--muted)] uppercase">
            {t('current.eyebrow')}
          </p>
          <h2 className="mt-1 flex items-center gap-2 font-display text-[22px] leading-tight text-accent">
            <Crown aria-hidden className="size-5" />
            {name}
          </h2>
        </div>

        <div className="flex flex-col items-start gap-1 text-[12.5px] text-[var(--muted)] sm:items-end">
          {pkg.ends_at !== null ? (
            <>
              <p>
                <Trans
                  ns="package"
                  i18nKey="current.until"
                  values={{ date: formatDate(pkg.ends_at, locale) }}
                  components={{ date: <span className="text-[var(--text)]" /> }}
                />
              </p>
              {pkg.days_left !== null ? (
                <p
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[12px] font-medium',
                    endingSoon
                      ? 'bg-[var(--status-warn-wash)] text-[var(--status-warn)]'
                      : 'bg-[var(--surface)] text-[var(--text)]',
                  )}
                >
                  {pkg.days_left === 0
                    ? t('current.endsToday')
                    : t('current.daysLeft', { count: pkg.days_left })}
                </p>
              ) : null}
            </>
          ) : pkg.is_contact_only ? (
            <p>{t('current.contactOnly')}</p>
          ) : (
            <p>{isDefault ? t('current.foreverDefault') : t('current.forever')}</p>
          )}
        </div>
      </div>

      {endingSoon && pkg.slug ? (
        <Alert variant="warning" title={t('current.endingSoon')}>
          <Button
            variant="secondary"
            size="sm"
            className="mt-2"
            onClick={() => onAskFor(pkg.slug!)}
          >
            {t('current.extend')}
          </Button>
        </Alert>
      ) : null}

      {lapsed?.slug ? (
        <Alert
          variant="warning"
          title={t('current.lapsedTitle', {
            name: nameOf(lapsed.name, lapsed.slug),
            date: lapsed.ended_at ? formatDate(lapsed.ended_at, locale) : '',
          })}
        >
          <p>
            {t('current.lapsedBody', { name: nameOf(lapsed.name, lapsed.slug), current: name })}
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-2"
            onClick={() => onAskFor(lapsed.slug!)}
          >
            {t('current.renew')}
          </Button>
        </Alert>
      ) : null}

      {upcoming?.slug && upcoming.starts_at ? (
        <Alert variant="info">
          <Trans
            ns="package"
            i18nKey="current.upcoming"
            values={{
              name: nameOf(upcoming.name, upcoming.slug),
              date: formatDate(upcoming.starts_at, locale),
            }}
            components={{ date: <strong className="font-medium" /> }}
          />
        </Alert>
      ) : null}

      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {limitRows.map((row) => (
          <div
            key={row.id}
            className="flex items-center justify-between gap-2 rounded-[10px] bg-[var(--surface)] px-3 py-2.5"
          >
            <dt className="text-[13px] text-[var(--muted)]">{row.label}</dt>
            <dd>
              <LimitBadge used={row.value.used} limit={row.value.limit} />
            </dd>
          </div>
        ))}
      </dl>

      <div>
        <p className="text-[12px] font-medium text-[var(--muted)]">{t('current.includedTitle')}</p>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {PACKAGE_ROWS.flatMap((row) =>
            row.kind === 'flag'
              ? [
                  <li
                    key={row.key}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px]',
                      plan[row.key]
                        ? 'bg-[var(--surface)] text-[var(--text)]'
                        : 'text-[var(--faint)]',
                    )}
                  >
                    {plan[row.key] ? (
                      <Check aria-hidden className="size-3.5 text-accent" />
                    ) : (
                      <Lock aria-hidden className="size-3" />
                    )}
                    {t(`rows.${row.key}`)}
                    <span className="sr-only">
                      {plan[row.key] ? t('compare.included') : t('compare.notIncluded')}
                    </span>
                  </li>,
                ]
              : [],
          )}
        </ul>
      </div>
    </section>
  )
}
