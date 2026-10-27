import { IconChevronRight, type TablerIcon } from '@tabler/icons-react'
import { useId, type ReactNode } from 'react'
import { cn } from '@/shared/utils/dom/cn'

export type HomeTileProps = {
  icon: TablerIcon
  /** The icon circle's wash and the icon's colour, e.g. "bg-accent-wash text-accent". */
  tint: string
  label: ReactNode
  /** The number, already formatted. */
  value: ReactNode
  /** A line at the tile's foot: the change against yesterday, the package's limit. */
  foot?: ReactNode
  onClick: () => void
}

/**
 * One number on Home, a tap from its page: an icon, its label and the number
 * beside it, then a line at its foot. Today's numbers and Quick's counts are
 * both made of it.
 */
export function HomeTile({ icon: Icon, tint, label, value, foot, onClick }: HomeTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        '@container flex min-w-0 flex-col gap-2 glass-card rounded-card p-2 text-start min-[380px]:p-2.5',
        'transition-colors hover:bg-[var(--hover-wash)]',
        'focus-ring',
      )}
    >
      {/* The label and the number beside the icon, the arrow at the end of
          the number's line (short, so the label keeps the width); in a narrow
          tile the icon steps down, and on the narrowest phones all go under
          it, so no word breaks. */}
      <span className="grid grid-cols-1 gap-y-1 @min-[5rem]:grid-cols-[auto_minmax(0,1fr)_auto] @min-[5rem]:items-center @min-[5rem]:gap-x-1.5 @min-[5rem]:gap-y-0.5">
        <span
          aria-hidden
          className={cn(
            'grid size-6 shrink-0 place-items-center rounded-full @min-[5rem]:row-span-2 @min-[6rem]:size-8',
            tint,
          )}
        >
          <Icon className="size-3 @min-[6rem]:size-4" stroke={1.7} />
        </span>
        <span className="text-[11px] leading-tight [overflow-wrap:anywhere] @min-[5rem]:col-span-2 @min-[6rem]:text-[12px]">
          {label}
        </span>
        <IconChevronRight
          aria-hidden
          className="hidden size-3.5 shrink-0 text-[var(--faint)] @min-[5rem]:col-start-3 @min-[5rem]:row-start-2 @min-[5rem]:block rtl:rotate-180"
        />
        <span className="text-[22px] leading-none font-semibold tabular-nums @min-[5rem]:col-start-2 @min-[5rem]:row-start-2">
          {value}
        </span>
      </span>
      {/* At the tile's foot, so a row of tiles lines up when a label takes two lines. */}
      {foot ? <span className="mt-auto text-[11px] leading-snug">{foot}</span> : null}
    </button>
  )
}

export type HomeTilesProps = {
  title: ReactNode
  /** A short line at the heading's end: "Live", "Tap to open". */
  note: ReactNode
  /** How many tiles share the row (four go two by two on a phone). */
  columns: 2 | 3 | 4
  children: ReactNode
}

/** A row of Home tiles under its heading, the same for Today and Quick. */
export function HomeTiles({ title, note, columns, children }: HomeTilesProps) {
  const id = useId()

  return (
    <section aria-labelledby={id} className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-0.5">
        <h2 id={id} className="font-display text-[20px] leading-tight">
          {title}
        </h2>
        <p className="text-[11px] text-[var(--muted)]">{note}</p>
      </div>
      <div
        className={cn(
          'grid gap-1.5 min-[380px]:gap-2',
          columns === 4
            ? 'grid-cols-2 sm:grid-cols-4'
            : columns === 3
              ? 'grid-cols-3'
              : 'grid-cols-2',
        )}
      >
        {children}
      </div>
    </section>
  )
}
