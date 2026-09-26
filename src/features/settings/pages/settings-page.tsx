import { zodResolver } from '@hookform/resolvers/zod'
import { ExternalLink } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { useSession } from '@/features/auth/hooks/use-session'
import { Form, FormActions } from '@/shared/components/forms'
import { ErrorState } from '@/shared/components/feedback'
import { Alert, Button } from '@/shared/components/ui'
import { LOCALE_LABELS, type Locale } from '@/shared/constants/locales'
import { useApiFormErrors } from '@/shared/hooks/use-api-form-errors'
import { cn } from '@/shared/utils/dom/cn'
import { ContactSection } from '../components/contact/contact-section'
import { LocalisationSection } from '../components/localisation/localisation-section'
import { OpeningHoursSection } from '../components/localisation/opening-hours-section'
import { BrandingSection } from '../components/media/branding-section'
import { IdentitySection } from '../components/profile/identity-section'
import { useSaveSettings, useSettings } from '../hooks/use-settings'
import {
  WEEKDAYS,
  settingsSchema,
  type Settings,
  type SettingsFormValues,
} from '../schemas/settings.schema'

/** A week with every day switched off, which is what "not set yet" means. */
const CLOSED_WEEK = Object.fromEntries(
  WEEKDAYS.map((day) => [day, { closed: true, open: '09:00', close: '22:00' }]),
) as SettingsFormValues['opening_hours']

const EMPTY: SettingsFormValues = {
  name: '',
  description: '',
  google_maps_url: '',
  country_code: '',
  phone: '',
  currency: 'USD',
  timezone: 'UTC',
  opening_hours: CLOSED_WEEK,
  logo: null,
  cover_image: null,
  delete_cover_image: false,
}

/**
 * Everything about the restaurant itself: its name, how guests reach it, the
 * money its prices are in, and the two pictures the menu is built around.
 *
 * The owner writes in one language, chosen at onboarding, so the translatable
 * columns are edited as plain fields and written back to that locale.
 */
function toFormValues(settings: Settings): SettingsFormValues {
  const locale = (settings.default_locale === 'ar' ? 'ar' : 'en') satisfies Locale

  return {
    name: settings.name[locale] ?? settings.name.en ?? settings.name.ar ?? '',
    description: settings.description[locale] ?? '',
    google_maps_url: settings.google_maps_url ?? '',
    country_code: settings.country_code ?? '',
    phone: settings.phone ?? '',
    currency: settings.currency,
    timezone: settings.timezone,
    // A day with no range keeps usable defaults in its boxes, so switching it
    // on does not start from an empty field.
    opening_hours: Object.fromEntries(
      WEEKDAYS.map((day) => {
        const range = settings.opening_hours[day]
        return [
          day,
          {
            closed: range === null,
            open: range?.open ?? '09:00',
            close: range?.close ?? '22:00',
          },
        ]
      }),
    ) as SettingsFormValues['opening_hours'],
    logo: null,
    cover_image: null,
    delete_cover_image: false,
  }
}

export function SettingsPage() {
  const settings = useSettings()
  const save = useSaveSettings()
  // The menu is served from the API's domain, not the dashboard's, so the
  // address has to come from the session rather than being built from the slug.
  const publicUrl = useSession().data?.restaurant?.public_url ?? null

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    mode: 'onBlur',
    defaultValues: EMPTY,
  })

  const { formError, applyApiError, clearFormError } = useApiFormErrors(form.setError)

  // Fill the form the first time the restaurant arrives, and again whenever a
  // save returns, but never while the owner is mid-edit: `reset` would wipe
  // what they had typed.
  const loadedRef = useRef<string | null>(null)
  const data = settings.data

  useEffect(() => {
    if (data === undefined) return
    const stamp = JSON.stringify(data)
    if (loadedRef.current === stamp) return
    loadedRef.current = stamp
    form.reset(toFormValues(data))
  }, [data, form])

  const languageName = useMemo(
    () => (data?.default_locale === 'ar' ? LOCALE_LABELS.ar : LOCALE_LABELS.en),
    [data?.default_locale],
  )

  const onSubmit = form.handleSubmit((values) => {
    clearFormError()
    save.mutate(
      {
        name: values.name,
        description: values.description || null,
        google_maps_url: values.google_maps_url || null,
        country_code: values.country_code || null,
        phone: values.phone,
        currency: values.currency,
        timezone: values.timezone,
        opening_hours: Object.fromEntries(
          WEEKDAYS.map((day) => {
            const entry = values.opening_hours[day]
            return [day, entry.closed ? null : { open: entry.open, close: entry.close }]
          }),
        ),
        // Keys are only sent when a new file was picked in this session;
        // leaving one out keeps whatever is already stored.
        ...(values.logo ? { logo_key: values.logo.key } : {}),
        ...(values.cover_image ? { cover_image_key: values.cover_image.key } : {}),
        ...(values.delete_cover_image ? { delete_cover_image: true } : {}),
      },
      { onError: (error) => applyApiError(error) },
    )
  })

  if (settings.isPending) {
    return (
      <div className="flex flex-1 flex-col gap-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-40 animate-pulse rounded-[14px] bg-[var(--hover-wash)]" />
        ))}
      </div>
    )
  }

  if (settings.isError) {
    return (
      <div className="flex flex-1 flex-col">
        <ErrorState description={settings.error.message} onRetry={() => void settings.refetch()} />
      </div>
    )
  }

  const dirty = form.formState.isDirty

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-[19px] leading-tight">Restaurant</h2>
          <p className="mt-1 text-[13px] leading-snug text-[var(--muted)]">
            What guests see at the top of your menu, and how they reach you.
          </p>
        </div>
        {data ? (
          <a
            href={publicUrl ?? `/${data.slug}`}
            target="_blank"
            rel="noreferrer noopener"
            className={cn(
              'force-ltr inline-flex items-center gap-1.5 text-[12.5px] text-[var(--muted)]',
              'hover:text-accent hover:underline',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-on)]',
            )}
          >
            /{data.slug}
            <ExternalLink aria-hidden className="size-3" />
          </a>
        ) : null}
      </div>

      {formError ? (
        <Alert variant="error" title="That did not save" onDismiss={clearFormError}>
          {formError}
        </Alert>
      ) : null}

      <Form onSubmit={onSubmit}>
        {/* Two columns once there is room: a single column of inputs across a
            wide screen leaves most of it empty and the save button miles down. */}
        <div className="grid items-start gap-4 xl:grid-cols-2">
          <IdentitySection control={form.control} languageName={languageName} />
          <ContactSection
            control={form.control}
            locationUrl={form.watch('google_maps_url')}
            onPickLocation={(url) =>
              form.setValue('google_maps_url', url, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          />
          <LocalisationSection control={form.control} languageName={languageName} />
          <OpeningHoursSection control={form.control} />
          <BrandingSection
            control={form.control}
            currentLogoUrl={data?.logo_url ?? null}
            currentCoverUrl={data?.cover_url ?? null}
          />
        </div>

        {/* Pinned to the bottom of the viewport: the form is long enough that a
            button at its end would be off screen while editing the first field. */}
        <FormActions
          align="between"
          className={cn(
            'sticky bottom-0 z-10 -mx-4 mt-1 border-t-[0.5px] border-[var(--line)] px-4 py-3 sm:-mx-6 sm:px-6',
            'bg-[color-mix(in_srgb,var(--bg)_88%,transparent)] backdrop-blur-[16px]',
          )}
        >
          <span className="text-[12.5px] text-[var(--muted)]">
            {dirty ? 'You have unsaved changes.' : 'Everything is saved.'}
          </span>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              disabled={!dirty || save.isPending}
              onClick={() => data && form.reset(toFormValues(data))}
            >
              Undo changes
            </Button>
            <Button type="submit" loading={save.isPending} disabled={!dirty}>
              Save changes
            </Button>
          </div>
        </FormActions>
      </Form>
    </div>
  )
}
