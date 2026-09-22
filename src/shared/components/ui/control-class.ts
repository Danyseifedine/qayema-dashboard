import { cn } from '@/shared/utils/dom/cn'

/**
 * The bare control inside a `FieldShell`. The shell owns the border, the
 * background and the focus ring, so the control itself must render none of
 * them — hence the explicit `focus:ring-0`.
 */
export const controlClass = cn(
  'w-full flex-1 appearance-none border-0 bg-transparent outline-none',
  'px-3.5 py-3.5 text-[15px] tracking-[-0.005em] text-[var(--text)]',
  'placeholder:text-[var(--placeholder)]',
  'focus:outline-none focus:ring-0',
  'disabled:cursor-not-allowed',
)
