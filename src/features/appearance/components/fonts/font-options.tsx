import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import type { FontScript } from '@/features/appearance/schemas/appearance.schema'
import { StatusChip } from '@/shared/components/data-display'
import { optionCardClass } from '@/shared/components/ui'
import { cn } from '@/shared/utils/dom/cn'

export type FontOptionsProps = {
  /** The languages this script covers, e.g. "English · Español". */
  legend: string
  script: FontScript
  onChange: (family: string) => void
}

/**
 * The fonts for one writing system, a row each: its letters large in a small
 * block ("Aa", or the script's first letter), then the same dish name in it,
 * so the owner compares the letters, not the words.
 *
 * Real radio inputs underneath, like ChoiceField, so arrow keys move between
 * fonts and a screen reader hears a radio group. It is not ChoiceField because
 * a font needs its own sample, and a pick here saves at once rather than
 * waiting for a form.
 */
export function FontOptions({ legend, script, onChange }: FontOptionsProps) {
  const { t } = useTranslation('appearance')
  const name = useId()
  const glyph = /[A-Za-z]/.test(script.sample) ? 'Aa' : script.sample.trim().charAt(0)

  return (
    // A fieldset will not shrink below its content by default, and pushed the
    // whole page wider than a phone.
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend className="label-caps mb-2 text-[var(--muted)]">{legend}</legend>

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        {script.options.map((option) => {
          const checked = script.value === option.family
          const font = { fontFamily: `'${option.family}', system-ui, sans-serif` }

          return (
            <label
              key={option.family}
              className={cn(
                'flex items-center gap-3 rounded-tile p-2.5',
                optionCardClass(checked),
                // Frosted, as a setting's tile on the design's card.
                !checked && 'frost-tile hover:bg-[var(--hover-wash)]',
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.family}
                checked={checked}
                onChange={() => onChange(option.family)}
                className="sr-only"
              />
              <span
                aria-hidden
                dir="auto"
                className="grid size-10 shrink-0 place-items-center rounded-tile bg-[var(--hover-wash)] text-[18px] text-accent sm:size-11 sm:text-[20px]"
                style={font}
              >
                {glyph}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span
                  dir="auto"
                  className="truncate text-[14px] leading-snug sm:text-[15px]"
                  style={font}
                >
                  {script.sample}
                </span>
                <span className="flex min-w-0 items-center gap-1.5 truncate text-[11.5px] text-[var(--muted)] sm:text-[12px]">
                  <span className="text-[var(--text)]">{option.family}</span>
                  <span aria-hidden>·</span>
                  {t(`fonts.categories.${option.category}`, { defaultValue: option.category })}
                </span>
              </span>
              {option.family === script.default ? (
                <StatusChip tone="faded">{t('fonts.default')}</StatusChip>
              ) : null}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
