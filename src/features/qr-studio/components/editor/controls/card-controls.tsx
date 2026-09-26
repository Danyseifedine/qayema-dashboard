import type { Control } from 'react-hook-form'
import { ChoiceField, SwitchField, TextField, type ChoiceOption } from '@/shared/components/forms'
import type { CardTheme, QrFormValues } from '../../../schemas/qr.schema'

function swatch(colour: string) {
  return (
    <span
      className="block h-7 w-6 rounded-[5px] border-[0.5px] border-[var(--line)]"
      style={{ background: colour }}
    />
  )
}

/** The printable table card the code sits on. The code itself is unaffected. */
export function CardControls({
  control,
  brandColor,
}: {
  control: Control<QrFormValues>
  /** The menu's main colour, so "Your colour" shows the real one. */
  brandColor: string
}) {
  const themes: ChoiceOption<CardTheme>[] = [
    { value: 'light', label: 'Light', preview: swatch('#FFFFFF') },
    { value: 'dark', label: 'Dark', preview: swatch('#111418') },
    { value: 'brand', label: 'Your colour', preview: swatch(brandColor) },
  ]

  return (
    <>
      <ChoiceField
        control={control}
        name="card_theme"
        label="Card"
        options={themes}
        hint="“Your colour” uses your menu's main colour."
      />
      <TextField control={control} name="title" label="Title" maxLength={60} />
      <TextField
        control={control}
        name="subtitle"
        label="Subtitle"
        optionalText="optional"
        maxLength={80}
        placeholder="Scan · Browse · Order"
      />
      <TextField
        control={control}
        name="cta"
        label="Call to action"
        optionalText="optional"
        maxLength={60}
        placeholder="Scan to see the menu"
      />
      <SwitchField control={control} name="show_url" label="Show the link under the code" />
    </>
  )
}
