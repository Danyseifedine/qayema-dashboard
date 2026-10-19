import { cva, type VariantProps } from 'class-variance-authority'
import { IconLoader2 } from '@tabler/icons-react'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/shared/utils/dom/cn'

/**
 * Matches the portal's `.submit` / `.btn-ink` treatment: flat gold on ink,
 * darkening to `--gold-deep` on hover. The portal has no gradient button, no
 * disabled state and no focus ring; the last two are added here because a
 * dashboard form needs both.
 */
const button = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'rounded-[var(--radius-control)] font-medium tracking-[-0.005em]',
    'transition-[background-color,border-color,color,transform] duration-200',
    '[transition-timing-function:var(--ease-qayema)]',
    // `enabled:` keeps the press nudge off a disabled button. Dropping
    // `pointer-events-none` is deliberate: without it a disabled button
    // swallows hover, so a `title` explaining *why* it is disabled can
    // never be shown.
    'enabled:active:translate-y-px',
    'disabled:cursor-not-allowed disabled:opacity-50 aria-busy:cursor-progress',
    'focus-ring',
  ],
  {
    variants: {
      variant: {
        /** The brand action. Flat gold, ink label. */
        primary: 'border-[0.5px] border-gold bg-gold text-ink hover:border-gold-deep hover:bg-gold-deep',
        /** Bordered companion to a primary action. */
        secondary:
          'border-[0.5px] border-[var(--line-strong)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--bg)]',
        /** No chrome until hovered. Toolbars, row actions, dismissals. */
        ghost:
          'border-[0.5px] border-transparent text-[var(--text)] hover:bg-[var(--hover-wash)]',
        /** Destructive confirmations only. */
        danger: 'border-[0.5px] border-danger bg-danger text-white hover:brightness-110',
        /** An action the day has run out of (the writing help): soft red, never pressable. */
        spent:
          'border-[0.5px] border-status-danger-border bg-status-danger-wash text-status-danger disabled:opacity-100',
        /** Reads as a link, behaves as a button. */
        link: 'text-accent underline-offset-4 hover:underline',
      },
      size: {
        /** Small actions beside a field (the writing help). */
        xs: 'h-7 gap-1.5 px-2.5 text-[12.5px]',
        sm: 'h-9 px-3.5 text-[13px]',
        /**
         * As tall as a field: the same padding, line and hairline border as
         * `controlClass` in its shell, so the two round to the same height
         * on every screen and a row of both lines up.
         */
        md: 'px-5 py-2.5 text-[14px] leading-5',
        icon: 'size-10 px-0',
      },
      block: { true: 'w-full', false: '' },
    },
    defaultVariants: { variant: 'primary', size: 'md', block: false },
  },
)

export type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof button> & {
    /** Swaps the leading icon for a spinner and blocks interaction. */
    loading?: boolean
    leadingIcon?: ReactNode
  }

export function Button({
  className,
  variant,
  size,
  block,
  loading = false,
  leadingIcon,
  disabled,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(button({ variant, size, block }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <IconLoader2 aria-hidden className="size-4 animate-spin" /> : leadingIcon}
      {children}
    </button>
  )
}
