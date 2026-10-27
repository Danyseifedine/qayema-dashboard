import { IconCheck, IconCrown, IconSparkles, IconPhotoOff, IconLock } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/components/ui'
import type { Locale } from '@/shared/constants/locales'
import { cn } from '@/shared/utils/dom/cn'
import { nameOr, translated } from '@/shared/utils/string/translated'
import type { Design } from '@/features/design/schemas/design.schema'

/** A chip on the photo's corner: made for you, or premium. */
const PHOTO_CHIP =
  'absolute start-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-medium text-gold ring-[0.5px] ring-white/15'

export type DesignCardProps = {
  template: Design
  /** True when this is the restaurant's active design. */
  active: boolean
  locale: Locale
  busy?: boolean
  /** The package that includes a premium design, by name. */
  unlockedBy: string | null
  /** Premium designs were turned off for this restaurant by an admin. */
  turnedOff?: boolean
  onSelect: () => void
  onOpenPackage: () => void
}

/**
 * One menu design.
 *
 * Three states: the design in use, any other design, which is one tap away,
 * and a premium design the package does not include, which points to the
 * package that does (or, turned off by an admin, says so and leads nowhere).
 */
export function DesignCard({
  template,
  active,
  locale,
  busy = false,
  unlockedBy,
  turnedOff = false,
  onSelect,
  onOpenPackage,
}: DesignCardProps) {
  const { t } = useTranslation('design')
  const name = nameOr(template.name, locale, template.slug)
  const description = translated(template.description, locale)

  return (
    <article
      className={cn(
        'flex flex-col overflow-hidden glass-card rounded-card transition-shadow',
        // The design in use wears a gold ring.
        active && 'shadow-[0_0_0_1.5px_var(--color-gold),var(--card-lift)]',
      )}
    >
      {/* Fades into the card, as the photos on the More cards do. */}
      <div className="relative [mask-image:linear-gradient(to_bottom,#000_72%,transparent)]">
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

        {template.made_for_you ? (
          <span className={PHOTO_CHIP}>
            <IconSparkles aria-hidden className="size-3" />
            {t('card.madeForYou')}
          </span>
        ) : template.is_premium ? (
          <span className={PHOTO_CHIP}>
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

      <div className="flex flex-1 flex-col gap-1 p-3.5 pt-1">
        <h3 className="font-display text-[19px] leading-tight">{name}</h3>
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
          ) : template.locked && turnedOff ? (
            <Button
              variant="secondary"
              block
              disabled
              leadingIcon={<IconLock aria-hidden className="size-4" />}
            >
              {t('card.turnedOff')}
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
