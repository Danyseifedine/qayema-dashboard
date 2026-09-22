import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/shared/utils/dom/cn'
import { FieldLeading, FieldPrefix, FieldShell, FieldTrailing, type FieldTone } from './field-shell'
import { controlClass } from './control-class'

export type InputProps = Omit<ComponentProps<'input'>, 'prefix' | 'size'> & {
  tone?: FieldTone
  /** Icon rendered inside the field, before the text. */
  leadingIcon?: ReactNode
  /** Static text before the text, e.g. a currency code. */
  prefix?: ReactNode
  /** Counter, unit, or icon button after the text. */
  trailing?: ReactNode
  /** Class for the shell rather than the control. */
  shellClassName?: string
}

export function Input({
  tone = 'default',
  leadingIcon,
  prefix,
  trailing,
  className,
  shellClassName,
  disabled,
  type = 'text',
  ...props
}: InputProps) {
  return (
    <FieldShell tone={tone} disabled={disabled} className={shellClassName}>
      {leadingIcon ? <FieldLeading>{leadingIcon}</FieldLeading> : null}
      {prefix ? <FieldPrefix>{prefix}</FieldPrefix> : null}
      <input
        type={type}
        disabled={disabled}
        className={cn(
          controlClass,
          (leadingIcon || prefix) && 'ps-1',
          trailing && 'pe-0',
          className,
        )}
        {...props}
      />
      {trailing ? <FieldTrailing>{trailing}</FieldTrailing> : null}
    </FieldShell>
  )
}
