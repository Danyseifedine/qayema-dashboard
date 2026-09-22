import type { ComponentProps } from 'react'
import { cn } from '@/shared/utils/dom/cn'
import { FieldShell, type FieldTone } from './field-shell'
import { controlClass } from './control-class'

export type TextareaProps = ComponentProps<'textarea'> & {
  tone?: FieldTone
}

export function Textarea({ tone = 'default', className, disabled, rows = 4, ...props }: TextareaProps) {
  return (
    <FieldShell tone={tone} disabled={disabled} className="items-stretch">
      <textarea
        rows={rows}
        disabled={disabled}
        className={cn(controlClass, 'min-h-24 resize-y leading-relaxed', className)}
        {...props}
      />
    </FieldShell>
  )
}
