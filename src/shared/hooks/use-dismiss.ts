import { useEffect, type RefObject } from 'react'

/**
 * Closes a popover (a menu under its button) on a press anywhere outside it,
 * or on Escape, which also hands focus back to the button that opened it.
 * `onDismiss` should be stable, or the listeners are set again each render.
 */
export function useDismiss({
  open,
  onDismiss,
  container,
  trigger,
}: {
  open: boolean
  onDismiss: () => void
  /** The popover and its button: a press inside either keeps it open. */
  container: RefObject<HTMLElement | null>
  trigger: RefObject<HTMLElement | null>
}) {
  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) onDismiss()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      onDismiss()
      trigger.current?.focus()
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onDismiss, container, trigger])
}
