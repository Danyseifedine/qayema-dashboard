import { useWatch, type Control } from 'react-hook-form'
import { ChoiceField, SwitchField, type ChoiceOption } from '@/shared/components/forms'
import type { LogoSize, QrFormValues } from '../../../schemas/qr.schema'

const SIZE_OPTIONS: ChoiceOption<LogoSize>[] = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
]

export function LogoControls({
  control,
  hasLogo,
}: {
  control: Control<QrFormValues>
  /** Whether the restaurant has a logo to place at all. */
  hasLogo: boolean
}) {
  const on = useWatch({ control, name: 'logo' })

  return (
    <>
      <SwitchField
        control={control}
        name="logo"
        label="Your logo in the middle"
        description={
          hasLogo
            ? 'Error correction rises so the code still scans with part of it covered.'
            : 'Add a logo on the Restaurant page first.'
        }
        disabled={!hasLogo}
      />
      {on && hasLogo ? (
        <ChoiceField
          control={control}
          name="logo_size"
          label="Logo size"
          options={SIZE_OPTIONS}
          hint="A larger logo covers more of the code. If it stops scanning, go smaller."
        />
      ) : null}
    </>
  )
}
