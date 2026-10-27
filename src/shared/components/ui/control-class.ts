import { cn } from '@/shared/utils/dom/cn'

/**
 * The bare control inside a `FieldShell`. The shell owns the border, the
 * background and the focus ring, so the control itself must render none of
 * them, hence the explicit `focus:ring-0`. Every field in the dashboard is
 * this one height, about 41px with the shell's border.
 */
export const controlClass = cn(
  'w-full flex-1 appearance-none border-0 bg-transparent outline-none',
  'px-3.5 py-2.5 text-[14px] leading-5 tracking-[-0.005em] text-[var(--text)]',
  // A quieter, smaller example than the text typed over it; the line height
  // stays, so the field keeps its height.
  'placeholder:text-[12.5px] placeholder:text-[var(--placeholder)]',
  'focus:outline-none focus:ring-0',
  'disabled:cursor-not-allowed',
)

/**
 * A choice drawn as a card (a design's layout, a font, a radio of
 * pictures): gold tint once picked, a ring under the keyboard. Its
 * background when not picked is the caller's (a surface, a frosted tile).
 */
export function optionCardClass(checked: boolean): string {
  return cn(
    'cursor-pointer border-[0.5px] transition-colors',
    'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--gold-on)]',
    checked ? 'border-accent-border bg-accent-wash text-accent' : 'border-[var(--line)]',
  )
}

/** A list that drops from a control (Combobox, ActionMenu, the account menu): one look for all. */
export const menuPanelClass =
  'rounded-card border-[0.5px] border-[var(--line)] bg-[var(--surface)] p-1.5 shadow-pop'

/** One row in such a list; its highlight and colour are the caller's. */
export const menuItemClass =
  'flex w-full items-center gap-2.5 rounded-tile px-3 py-2 text-start text-[13.5px] transition-colors'
