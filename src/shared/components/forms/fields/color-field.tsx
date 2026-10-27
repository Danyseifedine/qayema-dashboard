import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { Input } from '@/shared/components/ui'
import { Field } from '@/shared/components/forms/layout/field'
import { cn } from '@/shared/utils/dom/cn'

const HEX = /^#[0-9a-fA-F]{6}$/

export type ColorFieldProps<T extends FieldValues> = {
  control: Control<T>
  name: FieldPath<T>
  label: string
  /** A small control beside the label, e.g. a reset. */
  action?: ReactNode
  /**
   * `inline`: the label above, the swatch beside the text. `tile`: a large
   * swatch beside the label, the text under both, for a colour on its own panel.
   */
  layout?: 'inline' | 'tile'
  className?: string
}

/**
 * A colour, bound to a React Hook Form field as `#RRGGBB`.
 *
 * The swatch opens the system picker; the text beside it takes a pasted or
 * typed hex. While typing, a half-finished value lives only in the input and
 * the form keeps the last whole colour, so the preview never flashes invalid.
 */
export function ColorField<T extends FieldValues>({
  control,
  name,
  label,
  action,
  layout = 'inline',
  className,
}: ColorFieldProps<T>) {
  const { t } = useTranslation()
  const { field, fieldState } = useController({ control, name })
  const value = typeof field.value === 'string' && HEX.test(field.value) ? field.value : '#000000'

  // What is in the text box while it has focus; null means "show the value".
  const [typing, setTyping] = useState<string | null>(null)

  const commit = (next: string) => field.onChange(next.toUpperCase())

  const picker = (
    <input
      type="color"
      value={value.toLowerCase()}
      onChange={(event) => commit(event.target.value)}
      aria-label={t('colorField.picker', { label })}
      className={cn(
        'shrink-0 cursor-pointer border-[0.5px] border-[var(--line)] bg-[var(--surface)] [&::-moz-color-swatch]:border-0 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0',
        layout === 'tile'
          ? 'size-9 rounded-tile p-0 sm:size-11 [&::-moz-color-swatch]:rounded-tile [&::-webkit-color-swatch]:rounded-tile'
          : 'size-10 rounded-control p-1 [&::-moz-color-swatch]:rounded-tile [&::-webkit-color-swatch]:rounded-tile',
      )}
    />
  )

  return (
    <Field
      label={layout === 'inline' ? label : undefined}
      action={layout === 'inline' ? action : undefined}
      error={fieldState.error?.message}
      className={className}
    >
      {({ id, describedBy, invalid }) => {
        const text = (
          <Input
            id={id}
            name={field.name}
            ref={field.ref}
            value={typing ?? value}
            placeholder="#000000"
            onFocus={() => setTyping(value)}
            onChange={(event) => {
              const next = event.target.value.trim()
              setTyping(next)
              if (HEX.test(next)) commit(next)
            }}
            onBlur={() => {
              setTyping(null)
              field.onBlur()
            }}
            dir="ltr"
            spellCheck={false}
            autoComplete="off"
            maxLength={7}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            tone={invalid ? 'error' : 'default'}
            shellClassName={layout === 'tile' ? 'w-full' : 'min-w-0 flex-1'}
            // Compact on a tile: the swatch is what the eye goes to.
            className={cn('font-mono uppercase', layout === 'tile' && 'py-2 text-[13px]')}
          />
        )

        return layout === 'tile' ? (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2.5">
              {picker}
              <label
                htmlFor={id}
                className="min-w-0 flex-1 text-[12.5px] leading-tight font-medium sm:text-[13.5px]"
              >
                {label}
              </label>
              {action}
            </div>
            {text}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {picker}
            {text}
          </div>
        )
      }}
    </Field>
  )
}
