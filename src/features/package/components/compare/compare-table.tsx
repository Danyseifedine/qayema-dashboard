import { Check, Minus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Locale } from '@/shared/constants/locales'
import { cn } from '@/shared/utils/dom/cn'
import { formatNumber } from '@/shared/utils/format/number'
import { translated } from '@/shared/utils/string/translated'
import type { Package } from '@/features/package/schemas/package.schema'
import {
  PACKAGE_GROUPS,
  PACKAGE_ROWS,
  type PackageRow,
} from '@/features/package/utils/package-rows'

export type CompareTableProps = {
  packages: Package[]
  /** The slug in force, marked as the owner's. */
  current: string | null
  locale: Locale
}

/**
 * Every feature as a row and every package as a column, grouped the way the
 * cards are. On a narrow screen the table scrolls inside its panel, with the
 * feature names held in place, so the page itself never scrolls sideways.
 */
export function CompareTable({ packages, current, locale }: CompareTableProps) {
  const { t } = useTranslation('package')

  const cell = (row: PackageRow, pkg: Package) => {
    if (row.kind === 'limit') {
      const value = pkg.features[row.key]
      return value === null ? (
        <span className="font-medium text-accent">{t('compare.unlimited')}</span>
      ) : (
        <span className="tabular-nums" dir="ltr">
          {formatNumber(value, locale)}
        </span>
      )
    }

    return pkg.features[row.key] ? (
      <>
        <Check aria-hidden className="mx-auto size-4 text-accent" />
        <span className="sr-only">{t('compare.included')}</span>
      </>
    ) : (
      <>
        <Minus aria-hidden className="mx-auto size-4 text-[var(--faint)]" />
        <span className="sr-only">{t('compare.notIncluded')}</span>
      </>
    )
  }

  return (
    // Focusable, so a keyboard can scroll it sideways on a narrow screen.
    <div
      role="region"
      aria-label={t('page.compareTitle')}
      tabIndex={0}
      className={cn(
        // Paint containment keeps the table's min-width inside this box: without
        // it a phone's layout viewport grew to fit the table, so the whole page
        // scrolled sideways (and in Arabic opened shifted).
        'overflow-x-auto contain-paint rounded-[14px] border-[0.5px] border-[var(--line)] bg-[var(--surface)]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-on)]',
      )}
    >
      <table className="w-full min-w-[560px] border-collapse text-[13px]">
        <thead>
          <tr className="border-b-[0.5px] border-[var(--line)]">
            <th
              scope="col"
              className="sticky start-0 bg-[var(--surface)] px-4 py-3 text-start font-medium text-[var(--muted)]"
            >
              {t('compare.feature')}
            </th>
            {packages.map((pkg) => {
              const name = translated(pkg.name, locale)
              return (
                <th
                  key={pkg.id}
                  scope="col"
                  className={cn(
                    'px-3 py-3 text-center font-display text-[15px] font-normal',
                    pkg.slug === current && 'bg-accent-wash text-accent',
                  )}
                >
                  {name.missing ? pkg.slug : name.text}
                  {pkg.slug === current ? (
                    <span className="block font-sans text-[11px] font-medium">
                      {t('compare.yours')}
                    </span>
                  ) : null}
                </th>
              )
            })}
          </tr>
        </thead>
        {PACKAGE_GROUPS.map((group) => (
          <tbody key={group}>
            <tr>
              <th
                scope="colgroup"
                colSpan={packages.length + 1}
                className="bg-[var(--hover-wash)] px-4 py-2 text-start text-[11.5px] font-medium tracking-[0.06em] text-[var(--muted)] uppercase"
              >
                {t(`groups.${group}`)}
              </th>
            </tr>
            {PACKAGE_ROWS.filter((row) => row.group === group).map((row) => (
              <tr key={row.key} className="border-t-[0.5px] border-[var(--line-2)]">
                <th
                  scope="row"
                  className="sticky start-0 bg-[var(--surface)] px-4 py-2.5 text-start font-normal"
                >
                  {t(`rows.${row.key}`)}
                </th>
                {packages.map((pkg) => (
                  <td
                    key={pkg.id}
                    className={cn(
                      'px-3 py-2.5 text-center',
                      pkg.slug === current && 'bg-accent-wash',
                    )}
                  >
                    {cell(row, pkg)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  )
}
