import { IconCheck, IconCrown, IconLock } from '@tabler/icons-react'
import { Trans, useTranslation } from 'react-i18next'
import type { AuthRestaurant } from '@/features/auth'
import { LimitBadge, StatusChip } from '@/shared/components/data-display'
import { Alert } from '@/shared/components/ui'
import type { Locale } from '@/shared/constants/locales'
import { cn } from '@/shared/utils/dom/cn'
import { formatDate } from '@/shared/utils/format/date'
import { nameOr, type TranslatableValue } from '@/shared/utils/string/translated'
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
  const { package: pkg, lapsed, upcoming, limits, plan, turned_off: turnedOff } = restaurant
  const credits = restaurant.writing_help?.credits
  const nameOf = (value: TranslatableValue, slug: string | null) =>
    nameOr(value, locale, slug ?? t('page.fallbackName'))
  const name = nameOf(pkg.name, pkg.slug)
  const endingSoon = pkg.days_left !== null && pkg.days_left <= ENDING_SOON_DAYS
  // What a request would ask for: this package again, or the one that ended.
  const extendSlug = endingSoon ? pkg.slug : null
  const renewSlug = lapsed?.slug ?? null

  const limitRows = [
    { id: 'dishes', label: t('current.dishes'), value: limits.dishes },
    { id: 'categories', label: t('current.categories'), value: limits.categories },
    { id: 'social_links', label: t('current.socialLinks'), value: limits.social_links },
    // The AI's credits this month, while it is on and capped: credits,
    // never money.
    ...(credits?.limit != null
      ? [
          {
            id: 'ai_credits',
            label: t('current.aiCredits'),
            value: { used: credits.limit - (credits.left ?? credits.limit), limit: credits.limit },
          },
        ]
      : []),
  ]

  return (
    <section className="flex flex-col gap-4 rounded-card border-[0.5px] border-accent-border bg-accent-wash p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[12px] tracking-[0.08em] text-[var(--muted)] uppercase">
            {t('current.eyebrow')}
          </p>
          <h2 className="mt-1 flex items-center gap-2 font-display text-[22px] leading-tight text-accent">
            <IconCrown aria-hidden className="size-5" />
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
                <StatusChip tone={endingSoon ? 'warning' : 'neutral'}>
                  {pkg.days_left === 0
                    ? t('current.endsToday')
                    : t('current.daysLeft', { count: pkg.days_left })}
                </StatusChip>
              ) : null}
            </>
          ) : pkg.is_contact_only ? (
            <p>{t('current.contactOnly')}</p>
          ) : (
            <p>{isDefault ? t('current.foreverDefault') : t('current.forever')}</p>
          )}
        </div>
      </div>

      {extendSlug ? (
        <Alert
          variant="warning"
          action={{ label: t('current.extend'), onClick: () => onAskFor(extendSlug) }}
        >
          {t('current.endingSoon')}
        </Alert>
      ) : null}

      {lapsed && renewSlug ? (
        <Alert
          variant={lapsed.offline ? 'error' : 'warning'}
          title={t('current.lapsedTitle', {
            name: nameOf(lapsed.name, renewSlug),
            date: lapsed.ended_at ? formatDate(lapsed.ended_at, locale) : '',
          })}
          action={{ label: t('current.renew'), onClick: () => onAskFor(renewSlug) }}
        >
          <p>
            {lapsed.offline || !lapsed.offline_at ? (
              t('current.lapsedOffline', { name: nameOf(lapsed.name, renewSlug) })
            ) : (
              <Trans
                ns="package"
                i18nKey="current.lapsedGrace"
                values={{ date: formatDate(lapsed.offline_at, locale) }}
                components={{ date: <strong className="font-medium" /> }}
              />
            )}
          </p>
        </Alert>
      ) : null}

      {upcoming?.slug && upcoming.starts_at ? (
        <Alert variant="warning">
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

      <dl
        className={cn(
          'grid grid-cols-1 gap-2',
          limitRows.length > 3 ? 'sm:grid-cols-2' : 'sm:grid-cols-3',
        )}
      >
        {limitRows.map((row) => (
          <div
            key={row.id}
            className="flex items-center justify-between gap-2 rounded-tile bg-[var(--surface)] px-3 py-2.5"
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
                      <IconCheck aria-hidden className="size-3.5 text-accent" />
                    ) : (
                      <IconLock aria-hidden className="size-3" />
                    )}
                    {t(`rows.${row.key}`)}
                    {/* The package may have it: an admin turned it off here. */}
                    {turnedOff.includes(row.key) ? (
                      <span>· {t('current.turnedOff')}</span>
                    ) : (
                      <span className="sr-only">
                        {plan[row.key] ? t('compare.included') : t('compare.notIncluded')}
                      </span>
                    )}
                  </li>,
                ]
              : [],
          )}
        </ul>
      </div>
    </section>
  )
}
