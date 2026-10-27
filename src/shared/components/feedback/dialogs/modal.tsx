import { createContext, useContext, useEffect, useId, useRef, type ReactNode } from 'react'
import { FormActions } from '@/shared/components/forms/layout/form'
import { cn } from '@/shared/utils/dom/cn'

// On a phone a dialog keeps a 12px gutter on every side (GUTTER below).
const WIDTH = {
  sm: 'w-[min(calc(100vw-24px),420px)]',
  md: 'w-[min(calc(100vw-24px),460px)]',
  lg: 'w-[min(calc(100vw-24px),520px)]',
} as const

/**
 * The browser caps a modal `<dialog>` at the screen minus about 40px each way
 * (`calc(100% - 6px - 2em)`), which leaves wide empty bands on a phone. This
 * replaces that cap with a 12px gutter.
 */
const GUTTER = 'max-h-[calc(100dvh-24px)] max-w-[calc(100vw-24px)]'

export type ModalProps = {
  open: boolean
  /** Asked to close, by Escape or a click on the backdrop. Ignored while `busy`. */
  onClose: () => void
  /** Something is being saved: the dialog stays open until it settles. */
  busy?: boolean
  size?: keyof typeof WIDTH
  className?: string
  children: ReactNode
}

/** The id the dialog is named by, which its ModalHeader takes. */
const ModalTitleId = createContext<string | undefined>(undefined)

/**
 * Every dialog's frame, on the native `<dialog>`: the browser supplies the
 * top layer, the focus trap and Escape, which fires `cancel` and goes to
 * `onClose` like the backdrop does, so the caller always learns it closed.
 * It is named by its heading, so a screen reader says which dialog opened.
 */
export function Modal({
  open,
  onClose,
  busy = false,
  size = 'md',
  className,
  children,
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    // Set by the time effects run: the dialog is always on the page.
    const dialog = ref.current!
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
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
        GUTTER,
        WIDTH[size],
        className,
      )}
    >
      <ModalTitleId.Provider value={titleId}>{children}</ModalTitleId.Provider>
    </dialog>
  )
}

/** A dialog's title, and the line under it saying what it does. */
export function ModalHeader({ title, description }: { title: ReactNode; description?: ReactNode }) {
  const id = useContext(ModalTitleId)

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

/** A dialog's content above its footer: its header, alerts and fields. */
export function ModalBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('p-5 pb-0', className)}>{children}</div>
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
