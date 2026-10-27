import { IconBan, type TablerIcon } from '@tabler/icons-react'
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { HelperText, optionCardClass } from '@/shared/components/ui'
import { cn } from '@/shared/utils/dom/cn'
import {
  CATEGORY_ICONS,
  type CategoryIconKey,
} from '@/features/menu/categories/constants/category-icons'

export type IconPickerFieldProps<T extends FieldValues> = {
  control: Control<T>
  /** The field holding the icon's key, null for none. */
  name: FieldPath<T>
  label: string
  hint: string
  /** Beside the label; left out when an icon is asked for. */
  optionalText?: string
}

/**
 * An icon the menu draws (a category's, a build's dish's), picked from a
 * grid (a radio group): none first, then every icon, each named for a
 * screen reader and in its tooltip.
 */
export function IconPickerField<T extends FieldValues>({
  control,
  name,
  label,
  hint,
  optionalText,
}: IconPickerFieldProps<T>) {
  const { t } = useTranslation('menu')
  const { field } = useController({ control, name })
  const choices: readonly { key: CategoryIconKey | null; Icon: TablerIcon }[] = [
    { key: null, Icon: IconBan },
    ...CATEGORY_ICONS,
  ]

  return (
    <fieldset className="flex flex-col gap-2 pt-2">
      {/* A group of choices has a legend, not a label; it borrows Label's look. */}
      <legend className="label-caps mb-2 flex w-full items-center justify-between gap-2 text-[var(--muted)]">
        <span>{label}</span>
        {optionalText ? (
          <span className="text-[12px] tracking-normal normal-case text-[var(--faint)]">
            {optionalText}
          </span>
        ) : null}
      </legend>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-1.5">
        {choices.map(({ key, Icon }) => {
          const checked = field.value === key
          const iconName = t(`categoryIcons.${key ?? 'none'}`)
          return (
            <label
              key={key ?? 'none'}
              title={iconName}
              className={cn(
                'grid aspect-square place-items-center rounded-tile',
                optionCardClass(checked),
                !checked && 'bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)]',
              )}
            >
              <input
                type="radio"
                name={field.name}
                className="sr-only"
                checked={checked}
                onChange={() => field.onChange(key)}
                aria-label={iconName}
              />
              <Icon aria-hidden className="size-5" stroke={1.8} />
            </label>
          )
        })}
      </div>
      <HelperText>{hint}</HelperText>
    </fieldset>
  )
}
