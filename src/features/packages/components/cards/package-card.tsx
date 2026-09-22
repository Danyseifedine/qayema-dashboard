import { Check } from 'lucide-react'
import { Money } from '@/shared/components/data-display'
import { Button } from '@/shared/components/ui'
import type { Locale } from '@/shared/constants/locales'
import { cn } from '@/shared/utils/dom/cn'
import { translated } from '@/shared/utils/string/translated'
import type { Package } from '../../schemas/package.schema'

export type PackageCardProps = {
  pkg: Package
  /** True when this is the package the restaurant is on. */
  current: boolean
  locale: Locale
  onRequest: () => void
}

/** A limit of null is unlimited, which reads better as a word than a symbol. */
function limitText(value: number | null, noun: string): string {
  return value === null ? `Unlimited ${noun}` : `${value.toLocaleString()} ${noun}`
}

/**
 * One package.
 *
 * Nothing is bought here: the only action is asking for it, because an admin
 * assigns packages by hand. The default package needs no action at all, since
 * every restaurant already has it.
 */
export function PackageCard({ pkg, current, locale, onRequest }: PackageCardProps) {
  const name = translated(pkg.name, locale)
  const description = translated(pkg.description, locale)

  const lines = [
    limitText(pkg.features.dish_limit, 'dishes'),
    limitText(pkg.features.category_limit, 'categories'),
    limitText(pkg.features.social_link_limit, 'social links'),
    pkg.features.qr_studio ? 'QR studio' : 'Basic QR code',
  ]

  return (
    <article
      className={cn(
        'flex flex-col rounded-[14px] border-[0.5px] bg-[var(--surface)] p-4',
        current ? 'border-gold shadow-[0_0_0_1px_var(--color-gold)]' : 'border-[var(--line)]',
      )}
    >
      <h3 className="font-display text-[17px] leading-tight">
        {name.missing ? pkg.slug : name.text}
      </h3>

      <p className="mt-2 flex items-baseline gap-1.5">
        {pkg.price_cents === null ? (
          <span className="font-display text-[24px] leading-none text-accent">Let's talk</span>
        ) : pkg.price_cents === 0 ? (
          <span className="font-display text-[24px] leading-none text-accent">Free</span>
        ) : (
          <>
            <Money
              amount={pkg.price_cents / 100}
              currency={pkg.currency}
              locale={locale}
              className="font-display text-[24px] leading-none text-accent"
            />
            <span className="text-[12px] text-[var(--muted)]">/ month</span>
          </>
        )}
      </p>

      {!description.missing ? (
        <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--muted)]">{description.text}</p>
      ) : null}

      <ul className="mt-3 flex flex-col gap-1.5">
        {lines.map((line) => (
          <li key={line} className="flex items-start gap-2 text-[13px]">
            <Check aria-hidden className="mt-0.5 size-3.5 shrink-0 text-accent" />
            <span>{line}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-4">
        {current ? (
          <Button variant="secondary" block disabled>
            Your package
          </Button>
        ) : pkg.is_default ? (
          <Button variant="ghost" block disabled>
            Included for everyone
          </Button>
        ) : (
          <Button block onClick={onRequest}>
            {pkg.is_contact_only ? 'Talk to us' : 'Request this package'}
          </Button>
        )}
      </div>
    </article>
  )
}
