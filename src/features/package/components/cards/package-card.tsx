import { IconCheck, IconSparkles } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { Money } from '@/shared/components/data-display'
import { Button } from '@/shared/components/ui'
import type { Locale } from '@/shared/constants/locales'
import { cn } from '@/shared/utils/dom/cn'
import { translated } from '@/shared/utils/string/translated'
import { useRowText } from '@/features/package/hooks/use-row-text'
import type { Package } from '@/features/package/schemas/package.schema'
import { highlightsOf } from '@/features/package/utils/package-rows'

export type PackageCardProps = {
  pkg: Package
  /** The package before this one, so the card can say "Everything in …, plus". */
  previous: Package | undefined
  /** True when this is the package the restaurant is on. */
  current: boolean
  locale: Locale
  onRequest: () => void
}

/**
 * One package: its price, what it adds, and the way to ask for it.
 *
 * Nothing is bought here: the only action is asking, because an admin assigns
 * packages by hand. The default package needs no action at all, since every
 * restaurant already has it.
 */
export function PackageCard({ pkg, previous, current, locale, onRequest }: PackageCardProps) {
  const { t } = useTranslation('package')
  const rowText = useRowText()
  const name = translated(pkg.name, locale)
  const description = translated(pkg.description, locale)
  const { base, rows } = highlightsOf(pkg, previous)
  // The admin's own lines (Custom: a design of their own...), in the
  // reader's language or English; otherwise what the package adds.
  const written =
    locale === 'ar' && pkg.highlights.ar.length > 0 ? pkg.highlights.ar : pkg.highlights.en
  const baseName = base ? translated(base.name, locale) : null

  return (
    <article
      className={cn(
        'relative flex flex-col rounded-[14px] border-[0.5px] bg-[var(--surface)] p-4',
        current
          ? 'border-gold shadow-[0_0_0_1px_var(--color-gold)]'
          : pkg.is_featured
            ? 'border-accent-border'
            : 'border-[var(--line)]',
      )}
    >
      {pkg.is_featured ? (
        <span className="absolute -top-2.5 start-4 inline-flex items-center gap-1 rounded-full bg-gold px-2.5 py-0.5 text-[11px] font-medium text-ink">
          <IconSparkles aria-hidden className="size-3" />
          {t('card.popular')}
        </span>
      ) : null}

      <h3 className="font-display text-[17px] leading-tight">
        {name.missing ? pkg.slug : name.text}
      </h3>

      <p className="mt-2 flex items-baseline gap-1.5">
        {pkg.price_cents === null ? (
          <span className="font-display text-[24px] leading-none text-accent">
            {t('card.letsTalk')}
          </span>
        ) : pkg.price_cents === 0 ? (
          <span className="font-display text-[24px] leading-none text-accent">
            {t('card.free')}
          </span>
        ) : (
          <>
            <Money
              amount={pkg.price_cents / 100}
              currency={pkg.currency}
              locale={locale}
              className="font-display text-[24px] leading-none text-accent"
            />
            <span className="text-[12px] text-[var(--muted)]">{t('card.perMonth')}</span>
          </>
        )}
      </p>

      {!description.missing ? (
        <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--muted)]">{description.text}</p>
      ) : null}

      <p className="mt-3 text-[12px] font-medium text-[var(--muted)]">
        {base && baseName
          ? t('card.everythingIn', { name: baseName.missing ? base.slug : baseName.text })
          : t('card.includes')}
      </p>
      <ul className="mt-1.5 flex flex-col gap-1.5">
        {(written.length > 0
          ? written.map((line, index) => ({ key: `line-${index}`, text: line }))
          : rows.map((row) => ({ key: row.key, text: rowText(row, pkg) }))
        ).map((line) => (
          <li key={line.key} className="flex items-start gap-2 text-[13px]">
            <IconCheck aria-hidden className="mt-0.5 size-3.5 shrink-0 text-accent" />
            <span>{line.text}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-4">
        {current ? (
          <Button variant="secondary" block disabled>
            {t('card.yours')}
          </Button>
        ) : pkg.is_default ? (
          <Button variant="ghost" block disabled>
            {t('card.includedForEveryone')}
          </Button>
        ) : (
          <Button block variant={pkg.is_featured ? 'primary' : 'secondary'} onClick={onRequest}>
            {pkg.is_contact_only ? t('card.talkToUs') : t('card.request')}
          </Button>
        )}
      </div>
    </article>
  )
}
