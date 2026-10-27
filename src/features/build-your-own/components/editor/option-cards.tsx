import type { ReactNode, Ref } from 'react'
import { HelperText, optionCardClass } from '@/shared/components/ui'
import { cn } from '@/shared/utils/dom/cn'

export type OptionCard<V extends string> = {
  value: V
  label: string
  hint: string
  /** A picture over the words: what the choice makes. */
  picture?: ReactNode
}

export type OptionCardsProps<V extends string> = {
  /** The radio group's name and, for a screen reader, what it picks. */
  name: string
  legend: string
  value: V | null
  options: readonly OptionCard<V>[]
  onChange: (value: V) => void
  error?: string
  /** The first radio, for the form to focus when nothing is picked. */
  inputRef?: Ref<HTMLInputElement>
  className?: string
}

/**
 * One of a few ways to go, each a card with its name, a line saying what it
 * means and maybe a picture: real radios underneath, so arrow keys move
 * between them and a screen reader hears a group. The editor's question
 * already heads it, so the legend is for screen readers only.
 */
export function OptionCards<V extends string>({
  name,
  legend,
  value,
  options,
  onChange,
  error,
  inputRef,
  className,
}: OptionCardsProps<V>) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="sr-only">{legend}</legend>
      <div className={cn('grid gap-2.5', className)}>
        {options.map((option, index) => {
          const checked = value === option.value
          return (
            <label
              key={option.value}
              className={cn(
                'flex flex-col gap-3 rounded-tile p-3',
                optionCardClass(checked),
                !checked && 'bg-[var(--surface)] hover:bg-[var(--hover-wash)]',
              )}
            >
              <input
                ref={index === 0 ? inputRef : undefined}
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {option.picture ? (
                <span
                  aria-hidden
                  className="inset-tile grid aspect-video place-items-center rounded-tile"
                >
                  {option.picture}
                </span>
              ) : null}
              <span>
                <span className="block text-[14.5px] font-medium text-[var(--text)]">
                  {option.label}
                </span>
                <span className="mt-0.5 block text-[12.5px] leading-snug text-[var(--muted)]">
                  {option.hint}
                </span>
              </span>
            </label>
          )
        })}
      </div>
      {error ? <HelperText tone="error">{error}</HelperText> : null}
    </fieldset>
  )
}
