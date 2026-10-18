import { IconChevronRight, IconInfoCircle } from '@tabler/icons-react'

/** "2 orders are still waiting." across the list; a tap shows only those. */
export function WaitingBar({ text, onShow }: { text: string; onShow: () => void }) {
  return (
    <button
      type="button"
      onClick={onShow}
      className="flex w-full items-center gap-3 rounded-card border-[0.5px] border-status-info-border bg-status-info-wash px-4 py-3 text-start text-[14px] font-medium text-status-info transition-colors hover:brightness-110 focus-ring"
    >
      <IconInfoCircle aria-hidden className="size-5 shrink-0" stroke={1.7} />
      <span className="min-w-0 flex-1">{text}</span>
      <IconChevronRight aria-hidden className="size-[18px] shrink-0 rtl:rotate-180" />
    </button>
  )
}
