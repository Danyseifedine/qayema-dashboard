import { useEffect, useRef, type ReactNode } from 'react'
import { FormActions } from '@/shared/components/forms/layout/form'
import { cn } from '@/shared/utils/dom/cn'

const WIDTH = {
  sm: 'w-[min(92vw,420px)]',
  md: 'w-[min(92vw,460px)]',
  lg: 'w-[min(94vw,520px)]',
} as const

export type ModalProps = {
  open: boolean
  /** Asked to close, by Escape or a click on the backdrop. Ignored while `busy`. */
  onClose: () => void
  /** Something is being saved: the dialog stays open until it settles. */
  busy?: boolean
  size?: keyof typeof WIDTH
  /** Its heading's id, when it has one. */
  labelledBy?: string
  className?: string
  children: ReactNode
}

/**
 * Every dialog's frame, on the native `<dialog>`: the browser supplies the
 * top layer, the focus trap and Escape, which fires `cancel` and goes to
 * `onClose` like the backdrop does, so the caller always learns it closed.
 */
export function Modal({
  open,
  onClose,
  busy = false,
  size = 'md',
  labelledBy,
  className,
  children,
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    // Set by the time effects run: the dialog is always on the page.
    const dialog = ref.current!
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onClose()
      }}
      onClick={(event) => {
        // A click on the backdrop lands on the dialog element itself.
        if (event.target === ref.current && !busy) onClose()
      }}
      className={cn(
        'm-auto rounded-card border-[0.5px] border-[var(--line)] p-0',
        'bg-[var(--surface)] text-[var(--text)] shadow-pop',
        WIDTH[size],
        className,
      )}
    >
      {children}
    </dialog>
  )
}

/** A dialog's title, and the line under it saying what it does. */
export function ModalHeader({
  id,
  title,
  description,
}: {
  id?: string
  title: ReactNode
  description?: ReactNode
}) {
  return (
    <div>
      <h2 id={id} className="font-display text-[19px] leading-tight">
        {title}
      </h2>
      {description ? (
        <p className="mt-1.5 text-[13px] leading-snug text-[var(--muted)]">{description}</p>
      ) : null}
    </div>
  )
}

/** A dialog's buttons, on a hairline across its foot. */
export function ModalFooter({
  align,
  className,
  children,
}: {
  align?: 'end' | 'between'
  className?: string
  children: ReactNode
}) {
  return (
    <FormActions
      align={align}
      className={cn('mt-4 border-t-[0.5px] border-[var(--line)] p-3.5', className)}
    >
      {children}
    </FormActions>
  )
}
