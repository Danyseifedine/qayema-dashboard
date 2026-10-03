import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Control } from 'react-hook-form'
import { Button } from '@/shared/components/ui'
import {
  ChoiceError,
  ChoiceNameInput,
  ChoicePriceInput,
} from '@/features/menu/dishes/components/options/choice-fields'
import type { DishFormInput } from '@/features/menu/dishes/schemas/dish.schema'

export type ChoiceRowProps = {
  control: Control<DishFormInput>
  /** The row, e.g. `variants.0.options.1` or `addons.2`. */
  path: string
  languages: readonly string[]
  language: string
  currency: string
  handle: ReactNode
  nameLabel: string
  priceLabel: string
  /** The price is the dish's whole price, not an extra (ChoicePriceInput). */
  full?: boolean
  removeLabel: string
  placeholder?: string
  onRemove: () => void
}

/** An option or an add-on: its name, what it adds to the price, and a way out. */
export function ChoiceRow({
  control,
  path,
  languages,
  language,
  currency,
  handle,
  nameLabel,
  priceLabel,
  full,
  removeLabel,
  placeholder,
  onRemove,
}: ChoiceRowProps) {
  return (
    <div className="flex flex-col gap-1 bg-[var(--surface)]">
      {/* One line on a wide screen. On a phone every control beside the
          name squeezed it to a few letters, so the row becomes a small block:
          the name across the top with its remove button, the price under it
          with the drag handle. */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5 rounded-[10px] bg-[var(--hover-wash)] p-1.5 sm:grid-cols-[auto_minmax(0,1fr)_132px_auto] sm:bg-transparent sm:p-0">
        <div className="col-start-2 row-start-2 sm:col-start-1 sm:row-start-1">{handle}</div>
        <ChoiceNameInput
          control={control}
          name={`${path}.name`}
          language={language}
          label={nameLabel}
          placeholder={placeholder}
          className="col-start-1 row-start-1 sm:col-start-2"
        />
        <ChoicePriceInput
          control={control}
          name={`${path}.price`}
          currency={currency}
          label={priceLabel}
          full={full}
          className="col-start-1 row-start-2 sm:col-start-3 sm:row-start-1"
        />
        <Button
          variant="ghost"
          size="icon"
          aria-label={removeLabel}
          onClick={onRemove}
          className="col-start-2 row-start-1 sm:col-start-4"
        >
          <X aria-hidden className="size-4" />
        </Button>
      </div>
      <div className="sm:ps-12">
        <ChoiceError control={control} path={path} languages={languages} language={language} />
      </div>
    </div>
  )
}
