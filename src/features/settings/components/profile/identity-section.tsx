import { Store } from 'lucide-react'
import type { Control } from 'react-hook-form'
import { FormSection, TextField, TextareaField } from '@/shared/components/forms'
import type { SettingsFormValues } from '../../schemas/settings.schema'

export type IdentitySectionProps = {
  control: Control<SettingsFormValues>
  /** The language these are written in, chosen at onboarding and fixed after. */
  languageName: string
}

/** What the restaurant is called and how it introduces itself. */
export function IdentitySection({ control, languageName }: IdentitySectionProps) {
  return (
    <FormSection
      title="Restaurant"
      description={`What guests see on your menu, written in ${languageName}.`}
    >
      <TextField
        control={control}
        name="name"
        label="Restaurant name"
        required
        leadingIcon={<Store />}
        maxLength={255}
        placeholder="Beit Qayema"
        hint="The heading at the top of your public menu. This is not your own name."
      />

      <TextareaField
        control={control}
        name="description"
        label="Description"
        optionalText="optional"
        rows={3}
        maxLength={2000}
        placeholder="A sentence or two about your food."
      />
    </FormSection>
  )
}
