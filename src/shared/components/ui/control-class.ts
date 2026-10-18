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
