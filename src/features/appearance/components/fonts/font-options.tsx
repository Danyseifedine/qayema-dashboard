import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import type { FontScript } from '@/features/appearance/schemas/appearance.schema'
import { cn } from '@/shared/utils/dom/cn'

export type FontOptionsProps = {
  /** The languages this script covers, e.g. "English · Español". */
  legend: string
  script: FontScript
  onChange: (family: string) => void
}

/**
 * The fonts for one writing system, each drawing the same dish name so the
 * owner compares the letters, not the words.
 *
 * Real radio inputs underneath, like ChoiceField, so arrow keys move between
 * fonts and a screen reader hears a radio group. It is not ChoiceField because
 * a font needs a full-width sample, and a pick here saves at once rather than
 * waiting for a form.
 */
export function FontOptions({ legend, script, onChange }: FontOptionsProps) {
  const { t } = useTranslation('appearance')
  const name = useId()

  return (
    <fieldset className="flex flex-col gap-2 pt-2">
      <legend className="label-caps mb-2 text-[var(--muted)]">{legend}</legend>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {script.options.map((option) => {
          const checked = script.value === option.family

          return (
            <label
              key={option.family}
              className={cn(
                'flex cursor-pointer flex-col gap-1.5 rounded-[12px] border-[0.5px] px-3.5 py-3 transition-colors',
                'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--gold-on)]',
                checked
                  ? 'border-[var(--gold-on)] bg-[var(--hover-wash)]'
                  : 'border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--bg)]',
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
                dir="auto"
                className="truncate text-[18px] leading-snug"
                style={{ fontFamily: `'${option.family}', system-ui, sans-serif` }}
              >
                {script.sample}
              </span>
              <span className="flex items-center gap-1.5 text-[12px] text-[var(--muted)]">
                <span className="text-[var(--text)]">{option.family}</span>
                <span aria-hidden>·</span>
                {t(`fonts.categories.${option.category}`, { defaultValue: option.category })}
                {option.family === script.default ? (
                  <span className="ms-auto rounded-full bg-[var(--hover-wash)] px-2 py-0.5 text-[10.5px]">
                    {t('fonts.default')}
                  </span>
                ) : null}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
