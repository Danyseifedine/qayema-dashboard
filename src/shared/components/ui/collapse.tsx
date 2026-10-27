import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '@/shared/utils/dom/cn'

type CollapseProps = {
  open: boolean
  children: ReactNode
  /** Spacing and layout of what is inside (kept inside, so a closed one is no height at all). */
  className?: string
}

/** How long it takes, as `duration-300` below. */
const DURATION = 300

/**
 * Content that slides open and shut under what opens it (a step, a card):
 * its height eases from nothing to what it needs (a grid row going from
 * 0fr to 1fr, which needs no measuring) as it fades in. It is put on the page
 * as it starts to open and taken off once it has shut, so a closed one
 * leaves nothing behind; while shutting it is already out of reach (hidden
 * from screen readers, not focusable). A phone that asks for less motion
 * opens and shuts it at once.
 */
export function Collapse({ open, children, className }: CollapseProps) {
  const [mounted, setMounted] = useState(open)
  const [shown, setShown] = useState(open)

  useEffect(() => {
    if (open) {
      setMounted(true)
      // A frame closed first, so the browser has something to ease from.
      const frame = requestAnimationFrame(() => setShown(true))
      return () => cancelAnimationFrame(frame)
    }
    setShown(false)
    const timer = window.setTimeout(() => setMounted(false), DURATION)
    return () => window.clearTimeout(timer)
  }, [open])

  if (!mounted) return null

  return (
    <div
      aria-hidden={!open}
      inert={!open}
      className={cn(
        'grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none',
        shown ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
      )}
    >
      <div className="min-h-0 overflow-hidden">
        <div className={className}>{children}</div>
      </div>
    </div>
  )
}
