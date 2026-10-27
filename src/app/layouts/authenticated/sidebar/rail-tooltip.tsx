import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export type RailTooltipProps = {
  /** The row it names, measured when the pointer or focus arrived. */
  anchor: DOMRect
  children: ReactNode
  /** Called when the page scrolls under it, so it never floats off its row. */
  onClose: () => void
}

/**
 * The name of a row in the collapsed sidebar, beside it. Drawn over the page,
 * since the sidebar's list scrolls and would cut it off. The row carries its
 * name as its label, so a screen reader skips this.
 */
export function RailTooltip({ anchor, children, onClose }: RailTooltipProps) {
  useEffect(() => {
    window.addEventListener('scroll', onClose, true)
    return () => window.removeEventListener('scroll', onClose, true)
  }, [onClose])

  const rtl = document.documentElement.dir === 'rtl'
  const gap = 14

  return createPortal(
    <div
      aria-hidden
      className="pointer-events-none fixed z-50 flex -translate-y-1/2 items-center gap-2 whitespace-nowrap rounded-tile border-[0.5px] border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-[13px] font-medium text-[var(--text)] shadow-pop animate-[rail-tip_160ms_var(--ease-qayema)] motion-reduce:animate-none"
      style={{
        top: anchor.top + anchor.height / 2,
        ...(rtl ? { right: window.innerWidth - anchor.left + gap } : { left: anchor.right + gap }),
      }}
    >
      {children}
    </div>,
    document.body,
  )
}
