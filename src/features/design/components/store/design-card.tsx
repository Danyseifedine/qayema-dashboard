import { IconCheck, IconCrown, IconPhotoOff, IconLock } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/components/ui'
import type { Locale } from '@/shared/constants/locales'
import { cn } from '@/shared/utils/dom/cn'
import { translated } from '@/shared/utils/string/translated'
import type { Design } from '@/features/design/schemas/design.schema'

export type DesignCardProps = {
  template: Design
  /** True when this is the restaurant's active design. */
  active: boolean
  locale: Locale
  busy?: boolean
  /** The package that includes a premium design, by name. */
  unlockedBy: string | null
  onSelect: () => void
  onOpenPackage: () => void
}

/**
 * One menu design.
 *
 * Three states: the design in use, any other design, which is one tap away,
 * and a premium design the package does not include, which points to the
 * package that does.
 */
export function DesignCard({
  template,
  active,
  locale,
  busy = false,
  unlockedBy,
  onSelect,
  onOpenPackage,
}: DesignCardProps) {
  const { t } = useTranslation('design')
  const name = translated(template.name, locale)
  const description = translated(template.description, locale)

  return (
    <article
      className={cn(
        'flex flex-col overflow-hidden rounded-[14px] border-[0.5px] bg-[var(--surface)] transition-colors',
        active ? 'border-gold shadow-[0_0_0_1px_var(--color-gold)]' : 'border-[var(--line)]',
      )}
    >
      <div className="relative">
        {template.thumbnail_url ? (
          <img
            src={template.thumbnail_url}
            alt=""
            loading="lazy"
            className="aspect-[4/3] w-full bg-[var(--color-sand)] object-cover"
          />
        ) : (
          <div className="grid aspect-[4/3] w-full place-items-center bg-[var(--hover-wash)] text-[var(--faint)]">
            <IconPhotoOff aria-hidden className="size-6" />
          </div>
        )}

        {template.is_premium ? (
          <span className="absolute start-2 top-2 inline-flex items-center gap-1 rounded-full bg-[var(--surface)] px-2.5 py-1 text-[11px] font-medium text-accent shadow-sm">
            <IconCrown aria-hidden className="size-3" />
            {t('card.premium')}
          </span>
        ) : null}

        {active ? (
          <div className="absolute end-2 top-2 flex gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-gold px-2.5 py-1 text-[11px] font-medium text-ink">
              <IconCheck aria-hidden className="size-3" />
              {t('card.inUse')}
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3.5">
        <h3 className="text-[15px] font-medium tracking-[-0.012em]">
          {name.missing ? template.slug : name.text}
        </h3>
        {!description.missing ? (
          <p className="line-clamp-2 text-[12.5px] leading-relaxed text-[var(--muted)]">
            {description.text}
          </p>
        ) : null}

        <div className="mt-auto pt-3">
          {active ? (
            <Button variant="secondary" block disabled>
              {t('card.currentlyInUse')}
            </Button>
          ) : template.locked ? (
            <Button
              variant="secondary"
              block
              leadingIcon={<IconLock aria-hidden className="size-4" />}
              onClick={onOpenPackage}
            >
              {unlockedBy ? t('card.comesWith', { name: unlockedBy }) : t('card.seePackages')}
            </Button>
          ) : (
            <Button block loading={busy} onClick={onSelect}>
              {t('card.use')}
            </Button>
          )}
        </div>
      </div>
    </article>
  )
}
