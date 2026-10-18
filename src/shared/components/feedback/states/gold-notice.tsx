import { IconArrowRight, IconSparkles, type TablerIcon } from '@tabler/icons-react'
import { useId, type ReactNode } from 'react'
import { Button } from '@/shared/components/ui'

export type GoldNoticeProps = {
  /** The block's picture, and the small badge on its corner. */
  icon: TablerIcon
  badge: TablerIcon
  /** May hold a word in gold: `<span className="text-accent">`. */
  title: ReactNode
  description: ReactNode
  action: string
  onAction: () => void
  /** The pill under the divider: the state the page is in. */
  note: string
}

/**
 * A page in a state the owner chose elsewhere (QR Studio switched off,
 * orders going to WhatsApp): what still works, and one button to change
 * it. A gold-lit panel whose glow drifts and whose block catches a passing
 * glint (`.gold-panel`, `.gold-sheen`). A narrow card puts a smaller block
 * beside the title and gives the words and the button the whole width.
 */
export function GoldNotice({
  icon: Icon,
  badge: Badge,
  title,
  description,
  action,
  onAction,
  note,
}: GoldNoticeProps) {
  const id = useId()

  return (
    <section aria-labelledby={id} className="@container gold-panel rounded-card p-4 sm:p-5">
      {/* A narrow card puts a smaller block beside the title and gives the
          words and the button the whole width under them; a wide one keeps
          the block beside everything. */}
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3.5 gap-y-3 @min-[28rem]:items-start @min-[28rem]:gap-x-5">
        <span
          aria-hidden
          className="gold-chip relative grid size-14 shrink-0 place-items-center rounded-[14px] shadow-[inset_0_1px_0_rgba(255,236,196,0.12),0_0_36px_-8px_rgba(248,211,141,0.4)] @min-[28rem]:row-span-3 @min-[28rem]:size-[88px] @min-[28rem]:rounded-[16px]"
        >
          <span className="gold-sheen" />
          <Icon className="size-8 @min-[28rem]:size-11" stroke={1.4} />
          <span className="absolute -end-1.5 -bottom-1.5 grid size-6 place-items-center rounded-full bg-gold text-ink shadow-[0_0_0_2.5px_var(--gold-panel-to)] @min-[28rem]:size-7">
            <Badge className="size-3 @min-[28rem]:size-3.5" stroke={2.2} />
          </span>
        </span>
        <h2
          id={id}
          className="font-sans text-[19px] leading-tight font-semibold @min-[28rem]:text-[20px]"
        >
          {title}
        </h2>
        <p className="col-span-2 text-[13px] leading-relaxed text-[var(--muted)] @min-[28rem]:col-span-1 @min-[28rem]:col-start-2 @min-[28rem]:-mt-1.5 @min-[28rem]:text-[14px]">
          {description}
        </p>
        <Button
          block
          className="col-span-2 justify-between @min-[28rem]:col-span-1 @min-[28rem]:col-start-2"
          onClick={onAction}
        >
          {action}
          <IconArrowRight aria-hidden className="size-[18px] rtl:rotate-180" />
        </Button>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <span
          aria-hidden
          className="h-px flex-1 bg-gradient-to-r from-transparent to-[var(--accent-border)] rtl:bg-gradient-to-l"
        />
        <span className="inline-flex items-center gap-1.5 rounded-full border-[0.5px] border-[var(--accent-border)] px-3 py-1 text-[11.5px] text-[var(--muted)]">
          <IconSparkles aria-hidden className="size-3.5 text-accent" />
          {note}
        </span>
        <span
          aria-hidden
          className="h-px flex-1 bg-gradient-to-l from-transparent to-[var(--accent-border)] rtl:bg-gradient-to-r"
        />
      </div>
    </section>
  )
}
