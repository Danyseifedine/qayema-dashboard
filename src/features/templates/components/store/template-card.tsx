import { Check, ImageOff } from 'lucide-react'
import { Button } from '@/shared/components/ui'
import type { Locale } from '@/shared/constants/locales'
import { cn } from '@/shared/utils/dom/cn'
import { translated } from '@/shared/utils/string/translated'
import type { Template } from '../../schemas/template.schema'

export type TemplateCardProps = {
  template: Template
  /** True when this is the restaurant's active design. */
  active: boolean
  locale: Locale
  busy?: boolean
  onSelect: () => void
}

/**
 * One menu design.
 *
 * Two states: the design in use, and any other design, which is one tap away.
 * Nothing here costs anything — a package grants limits and features, never a
 * look.
 */
export function TemplateCard({
  template,
  active,
  locale,
  busy = false,
  onSelect,
}: TemplateCardProps) {
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
            <ImageOff aria-hidden className="size-6" />
          </div>
        )}

        {active ? (
          <div className="absolute end-2 top-2 flex gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-gold px-2.5 py-1 text-[11px] font-medium text-ink">
              <Check aria-hidden className="size-3" />
              In use
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
              Currently in use
            </Button>
          ) : (
            <Button block loading={busy} onClick={onSelect}>
              Use this design
            </Button>
          )}
        </div>
      </div>
    </article>
  )
}
