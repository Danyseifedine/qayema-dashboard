import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, RotateCcw } from 'lucide-react'
import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { ColorField, Form, FormActions, FormSection } from '@/shared/components/forms'
import { Button } from '@/shared/components/ui'
import { menuColourSchema, type MenuColourValues } from '../../schemas/template.schema'

export type MenuColourSectionProps = {
  /** The colour the menu is drawn with now. */
  colour: string
  /** The design's own default, which "Reset" goes back to. */
  defaultColour: string
  saving: boolean
  onSave: (colour: string) => void
}

/**
 * What to print on the colour: near-black on a pale one, white on a strong
 * one. The same measure the menu itself uses (classic.blade.php), so the
 * preview and the menu never disagree.
 */
function inkOn(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16))
  return (0.2126 * r! + 0.7152 * g! + 0.0722 * b!) / 255 > 0.62 ? '#111418' : '#FFFFFF'
}

/**
 * The menu's main colour: the active category tab, the + on every dish and
 * the cart button. A small copy of those shows the choice before it is saved.
 */
export function MenuColourSection({
  colour,
  defaultColour,
  saving,
  onSave,
}: MenuColourSectionProps) {
  const { t } = useTranslation('templates')

  const form = useForm<MenuColourValues>({
    resolver: zodResolver(menuColourSchema),
    mode: 'onChange',
    defaultValues: { primary_color: colour },
  })

  // A save brings the new colour back from the server: it becomes the saved
  // value, so the form is clean again.
  useEffect(() => {
    form.reset({ primary_color: colour })
  }, [colour, form])

  const picked = useWatch({ control: form.control, name: 'primary_color' })
  const ink = inkOn(picked)
  const dirty = form.formState.isDirty
  const isDefault = picked.toUpperCase() === defaultColour.toUpperCase()

  const onSubmit = form.handleSubmit((values) => onSave(values.primary_color))

  return (
    <FormSection title={t('colour.title')} description={t('colour.description')}>
      <Form onSubmit={onSubmit}>
        <div className="grid items-end gap-4 sm:grid-cols-2">
          <ColorField control={form.control} name="primary_color" label={t('colour.label')} />

          {/* The three places guests see it, in miniature. */}
          <div
            aria-label={t('colour.previewLabel')}
            role="img"
            className="flex flex-col gap-2.5 rounded-[12px] border-[0.5px] border-[var(--line)] bg-white p-3 text-[#111418]"
          >
            <div className="flex gap-1.5 text-[12px]">
              <span
                className="rounded-[8px] px-2.5 py-1 font-semibold"
                style={{ background: picked, color: ink }}
              >
                {t('colour.previewTabActive')}
              </span>
              <span className="px-2.5 py-1 text-[rgba(17,20,24,0.58)]">
                {t('colour.previewTab')}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[13px] font-medium">{t('colour.previewDish')}</span>
              <span
                className="grid size-7 place-items-center rounded-full"
                style={{ background: picked, color: ink }}
              >
                <Plus aria-hidden className="size-4" />
              </span>
            </div>
          </div>
        </div>

        <FormActions align="between">
          <Button
            type="button"
            variant="ghost"
            disabled={isDefault}
            onClick={() =>
              form.setValue('primary_color', defaultColour.toUpperCase(), {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          >
            <RotateCcw aria-hidden className="size-4" />
            {t('colour.reset')}
          </Button>
          <Button type="submit" loading={saving} disabled={!dirty}>
            {t('colour.save')}
          </Button>
        </FormActions>
      </Form>
    </FormSection>
  )
}
