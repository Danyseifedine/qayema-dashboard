import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
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
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-on)]',
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
        /** Reads as a link, behaves as a button. */
        link: 'text-[var(--gold-on)] underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-9 px-3.5 text-[13px]',
        md: 'h-11 px-5 text-[14px]',
        lg: 'h-[50px] px-6 text-[14.5px]',
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
    trailingIcon?: ReactNode
  }

export function Button({
  className,
  variant,
  size,
  block,
  loading = false,
  leadingIcon,
  trailingIcon,
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
      {loading ? <Loader2 aria-hidden className="size-4 animate-spin" /> : leadingIcon}
      {children}
      {!loading && trailingIcon}
    </button>
  )
}
