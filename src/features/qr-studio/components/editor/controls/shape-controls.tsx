import type { Control } from 'react-hook-form'
import { ChoiceField, type ChoiceOption } from '@/shared/components/forms'
import type { CornerStyle, DotStyle, EyeStyle, QrFormValues } from '../../../schemas/qr.schema'
import { CORNER_PREVIEWS, DOT_PREVIEWS, EYE_PREVIEWS } from './shape-previews'

const DOT_OPTIONS: ChoiceOption<DotStyle>[] = [
  { value: 'square', label: 'Square', preview: DOT_PREVIEWS.square },
  { value: 'dots', label: 'Dots', preview: DOT_PREVIEWS.dots },
  { value: 'rounded', label: 'Rounded', preview: DOT_PREVIEWS.rounded },
  { value: 'extra-rounded', label: 'Extra rounded', preview: DOT_PREVIEWS['extra-rounded'] },
  { value: 'classy', label: 'Classy', preview: DOT_PREVIEWS.classy },
  { value: 'classy-rounded', label: 'Classy rounded', preview: DOT_PREVIEWS['classy-rounded'] },
]

const CORNER_OPTIONS: ChoiceOption<CornerStyle>[] = [
  { value: 'square', label: 'Square', preview: CORNER_PREVIEWS.square },
  { value: 'extra-rounded', label: 'Rounded', preview: CORNER_PREVIEWS['extra-rounded'] },
  { value: 'dot', label: 'Circle', preview: CORNER_PREVIEWS.dot },
]

const EYE_OPTIONS: ChoiceOption<EyeStyle>[] = [
  { value: 'square', label: 'Square', preview: EYE_PREVIEWS.square },
  { value: 'dot', label: 'Circle', preview: EYE_PREVIEWS.dot },
]

export function ShapeControls({ control }: { control: Control<QrFormValues> }) {
  return (
    <>
      <ChoiceField control={control} name="dot_style" label="Dots" options={DOT_OPTIONS} />
      <ChoiceField
        control={control}
        name="corner_style"
        label="Corner frames"
        options={CORNER_OPTIONS}
        hint="The three big squares a camera looks for first."
      />
      <ChoiceField
        control={control}
        name="eye_style"
        label="Corner centres"
        options={EYE_OPTIONS}
      />
    </>
  )
}
