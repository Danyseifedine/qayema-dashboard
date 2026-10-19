import { IconPencil, IconTrash } from '@tabler/icons-react'
import { Button } from '@/shared/components/ui/button'

export type RowActionsProps = {
  /** What a screen reader hears: "Edit Instagram link". */
  editLabel: string
  deleteLabel: string
  onEdit: () => void
  onDelete: () => void
}

/**
 * A list card's two actions, as on every row card in the dashboard (a social
 * link, a category, a dish): the pencil, then the bin, which turns red under
 * the pointer. The card draws what sits around them.
 */
export function RowActions({ editLabel, deleteLabel, onEdit, onDelete }: RowActionsProps) {
  return (
    <>
      <Button variant="ghost" size="icon" onClick={onEdit} aria-label={editLabel}>
        <IconPencil aria-hidden className="size-[18px]" stroke={1.7} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onDelete}
        aria-label={deleteLabel}
        className="text-[var(--muted)] hover:bg-status-danger-wash hover:text-status-danger"
      >
        <IconTrash aria-hidden className="size-[18px]" stroke={1.7} />
      </Button>
    </>
  )
}
