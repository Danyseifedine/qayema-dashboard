import { useEffect, useRef, type ReactNode } from 'react'
import { Button } from '@/shared/components/ui'
import { cn } from '@/shared/utils/dom/cn'

export type ConfirmDialogProps = {
  open: boolean
  title: ReactNode
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** Paints the confirm button as destructive. */
  destructive?: boolean
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * A modal that asks before something irreversible.
 *
 * Built on the native `<dialog>`, so the browser supplies the top layer, the
 * focus trap and Escape handling rather than us reimplementing them.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return

    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      // Escape fires `cancel`; route it through the same handler as the button
      // so the caller always learns the dialog closed.
      onCancel={(event) => {
        event.preventDefault()
        if (!loading) onCancel()
      }}
      onClick={(event) => {
        // A click on the backdrop lands on the dialog element itself.
        if (event.target === ref.current && !loading) onCancel()
      }}
      className={cn(
        'm-auto w-[min(92vw,420px)] rounded-[16px] border-[0.5px] border-[var(--line)] p-0',
        'bg-[var(--surface)] text-[var(--text)] shadow-pop',
      )}
    >
      <div className="flex flex-col gap-2 p-5">
        <h2 className="font-display text-[19px] leading-tight">{title}</h2>
        {description ? (
          <p className="text-[13.5px] leading-relaxed text-[var(--muted)]">{description}</p>
        ) : null}
      </div>
      <div className="flex justify-end gap-2.5 border-t-[0.5px] border-[var(--line)] p-3.5">
        <Button variant="ghost" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          variant={destructive ? 'danger' : 'primary'}
          onClick={onConfirm}
          loading={loading}
          autoFocus
        >
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  )
}
