import { zodResolver } from '@hookform/resolvers/zod'
import { Building2, Save, Tag } from 'lucide-react'
import { useForm } from 'react-hook-form'
import {
  CheckboxField,
  ColorField,
  ComboboxField,
  FieldGroup,
  Form,
  FormActions,
  FormSection,
  ImageField,
  PhoneField,
  PriceField,
  RadioGroupField,
  SwitchField,
  TextField,
  TextareaField,
  TranslatableTextField,
  UrlField,
} from '@/shared/components/forms'
import { Alert, Button } from '@/shared/components/ui'
import { CURRENCY_OPTIONS, findCurrency } from '@/shared/constants/currencies'
import { DEFAULT_COUNTRY } from '@/shared/constants/countries'
import { emptyTranslatable } from '@/shared/constants/locales'
import { useApiFormErrors } from '@/shared/hooks/use-api-form-errors'
import { ApiError } from '@/shared/types/api'
import { previewFormSchema, type PreviewFormValues } from '../schemas/preview.schema'

/**
 * Every form control in one place, wired to a real schema and real validation.
 *
 * This is the working surface for the form library until the dashboard's own
 * pages exist: submitting it runs the Zod rules, and the "simulate" button
 * feeds a Laravel-shaped 422 through the same path a real save would take.
 */
export function SettingsFormPreview() {
  const form = useForm<PreviewFormValues>({
    resolver: zodResolver(previewFormSchema),
    mode: 'onBlur',
    defaultValues: {
      name: emptyTranslatable(),
      description: emptyTranslatable(),
      tagline: '',
      address: '',
      google_maps_url: '',
      country_code: DEFAULT_COUNTRY,
      phone: '',
      currency: 'USD',
      default_locale: 'en',
      price: null,
      accent_color: '#F8D38D',
      is_published: true,
      accepts_terms: false,
      internal_note: '',
      logo: null,
      cover_image: null,
    },
  })

  const { formError, applyApiError, clearFormError, setFormError } = useApiFormErrors(form.setError)

  const currency = form.watch('currency')
  const symbol = findCurrency(currency)?.symbol ?? currency

  const onSubmit = form.handleSubmit((values) => {
    clearFormError()
    setFormError(null)
    // Nothing to POST yet; show what the API would receive.
    // eslint-disable-next-line no-console
    console.info('[form-preview] valid payload', values)
  })

  /** Replays a Laravel 422 so the server-error path stays exercised. */
  const simulateServerError = () => {
    applyApiError(
      new ApiError({
        message: 'The given data was invalid.',
        status: 422,
        code: 'validation_failed',
        errors: {
          'name.ar': ['The Arabic name is required.'],
          phone: ['Please enter a valid phone number using digits only.'],
        },
      }),
    )
  }

  return (
    <Form onSubmit={onSubmit} className="mx-auto max-w-3xl gap-7">
      {formError ? (
        <Alert variant="error" title="That did not save" onDismiss={clearFormError}>
          {formError}
        </Alert>
      ) : null}

      <FormSection
        title="Restaurant"
        description="Shown at the top of your public menu, in both languages."
      >
        <TranslatableTextField
          control={form.control}
          name="name"
          label="Name"
          required
          maxLength={255}
          placeholder={{ en: 'Beit Qayema', ar: 'بيت قيمة' }}
          hint="Owners see this in the dashboard; guests see it on the menu."
        />

        <TranslatableTextField
          control={form.control}
          name="description"
          label="Description"
          multiline
          rows={3}
          maxLength={2000}
          optionalText="optional"
        />

        <TextField
          control={form.control}
          name="tagline"
          label="Tagline"
          leadingIcon={<Tag />}
          maxLength={60}
          optionalText="optional"
          placeholder="Lebanese home cooking since 1998"
        />
      </FormSection>

      <FormSection title="Contact" description="How guests reach you from the menu.">
        <TextField
          control={form.control}
          name="address"
          label="Address"
          leadingIcon={<Building2 />}
          maxLength={500}
          optionalText="optional"
        />

        <FieldGroup>
          <PhoneField
            control={form.control}
            name="phone"
            countryName="country_code"
            label="Phone"
            required
            hint="Digits only. Shown as a tap-to-call link."
          />
          <UrlField
            control={form.control}
            name="google_maps_url"
            label="Google Maps link"
            optionalText="optional"
          />
        </FieldGroup>
      </FormSection>

      <FormSection title="Menu defaults" description="Applied to new dishes.">
        <FieldGroup>
          <ComboboxField
            control={form.control}
            name="currency"
            label="Currency"
            required
            options={CURRENCY_OPTIONS}
            placeholder="Search currencies"
            emptyText="No currency matches that"
          />
          <PriceField
            control={form.control}
            name="price"
            currency={symbol}
            label="Sample dish price"
            hint="Used only to preview how prices render."
          />
        </FieldGroup>

        <RadioGroupField
          control={form.control}
          name="default_locale"
          legend="Default menu language"
          required
          inline
          hint="The language guests see first when they open your menu."
          options={[
            { value: 'en', label: 'English', description: 'Opens left to right.' },
            { value: 'ar', label: 'العربية', description: 'Opens right to left.' },
          ]}
        />

        <ColorField
          control={form.control}
          name="accent_color"
          label="Accent colour"
          hint="Six-digit hex, for example #F8D38D."
        />
      </FormSection>

      <FormSection title="Media" description="JPEG, PNG or WebP, up to 10 MB each.">
        <FieldGroup>
          <ImageField
            control={form.control}
            name="logo"
            label="Logo"
            required
            aspect="square"
            context="logo"
            hint="Fitted inside 400 x 400 and converted to WebP."
          />
          <ImageField
            control={form.control}
            name="cover_image"
            label="Cover image"
            optionalText="optional"
            context="cover_image"
            hint="Cropped to 1920 x 600 and converted to WebP."
          />
        </FieldGroup>
      </FormSection>

      <FormSection title="Visibility">
        <SwitchField
          control={form.control}
          name="is_published"
          label="Menu is live"
          description="Turn this off to take the public menu down without deleting anything."
        />
        <TextareaField
          control={form.control}
          name="internal_note"
          label="Internal note"
          optionalText="only you see this"
          rows={3}
          maxLength={500}
          placeholder="Anything your team should know about these settings."
        />
        <CheckboxField
          control={form.control}
          name="accepts_terms"
          label="I confirm these details are correct"
          description="Required before the menu can be published."
        />
      </FormSection>

      <FormActions align="between">
        <Button type="button" variant="ghost" onClick={simulateServerError}>
          Simulate a server error
        </Button>
        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={() => form.reset()}>
            Reset
          </Button>
          <Button
            type="submit"
            loading={form.formState.isSubmitting}
            leadingIcon={<Save className="size-4" />}
          >
            Save changes
          </Button>
        </div>
      </FormActions>
    </Form>
  )
}
