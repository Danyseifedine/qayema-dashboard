import { zodResolver } from '@hookform/resolvers/zod'
import { IconExternalLink } from '@tabler/icons-react'
import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { imageChanges } from '@/features/uploads'
import { useSession } from '@/features/auth'
import { Form, FormActions } from '@/shared/components/forms'
import { ErrorState } from '@/shared/components/feedback'
import { Alert, Button } from '@/shared/components/ui'
import { useApiFormErrors } from '@/shared/hooks/use-api-form-errors'
import { cn } from '@/shared/utils/dom/cn'
import { ContactSection } from '@/features/restaurant/components/contact/contact-section'
import { MoneyTimeSection } from '@/features/restaurant/components/hours/money-time-section'
import { OpeningHoursSection } from '@/features/restaurant/components/hours/opening-hours-section'
import { BrandingSection } from '@/features/restaurant/components/branding/branding-section'
import { LinkSection } from '@/features/restaurant/components/identity/link-section'
import { IdentitySection } from '@/features/restaurant/components/identity/identity-section'
import { useSaveRestaurant, useRestaurant } from '@/features/restaurant/hooks/use-restaurant'
import { DEFAULT_MAIN_LANGUAGE } from '@/shared/constants/menu-languages'
import { useMenuLanguages } from '@/features/auth'
import { toMenuTextForm } from '@/shared/utils/string/menu-text'
import {
  WEEKDAYS,
  restaurantFormSchema,
  type Restaurant,
  type RestaurantFormValues,
} from '@/features/restaurant/schemas/restaurant.schema'

/** A week with every day switched off, which is what "not set yet" means. */
const CLOSED_WEEK = Object.fromEntries(
  WEEKDAYS.map((day) => [day, { closed: true, open: '09:00', close: '22:00' }]),
) as RestaurantFormValues['opening_hours']

const EMPTY: RestaurantFormValues = {
  // Until the restaurant loads; the form is reset to its languages then.
  name: { [DEFAULT_MAIN_LANGUAGE]: '' },
  description: { [DEFAULT_MAIN_LANGUAGE]: '' },
  google_maps_url: '',
  country_code: '',
  phone: '',
  currency: 'USD',
  timezone: 'UTC',
  opening_hours: CLOSED_WEEK,
  logo: null,
  cover_image: null,
}

/**
 * Everything about the restaurant itself: its name, the languages its menu is
 * written in, how guests reach it, the money its prices are in, and the two
 * pictures the menu is built around.
 */
function toFormValues(settings: Restaurant): RestaurantFormValues {
  return {
    name: toMenuTextForm(settings.name, settings.languages),
    description: toMenuTextForm(settings.description, settings.languages),
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
    ) as RestaurantFormValues['opening_hours'],
    logo: null,
    cover_image: null,
  }
}

export function RestaurantPage() {
  const { t } = useTranslation('restaurant')
  const settings = useRestaurant()
  const save = useSaveRestaurant()
  // The menu is served from the API's domain, not the dashboard's, so the
  // address has to come from the session rather than being built from the slug.
  const publicUrl = useSession().data?.restaurant?.public_url ?? null
  // The menu's languages, set on the Features page: a tab each for the name
  // and description, English alone while "Multiple languages" is off.
  const languages = useMenuLanguages()

  const form = useForm<RestaurantFormValues>({
    resolver: zodResolver(restaurantFormSchema),
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

  const onSubmit = form.handleSubmit((values) => {
    clearFormError()
    // Only the menu's languages are sent; text in any other language stays
    // on the server, hidden.
    const pick = (text: Record<string, string>) =>
      Object.fromEntries(languages.map((code) => [code, text[code] ?? '']))
    save.mutate(
      {
        name: pick(values.name),
        description: pick(values.description),
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
        // The logo can be replaced but never removed, so it has no delete flag.
        ...imageChanges(values.logo, 'logo_key'),
        ...imageChanges(values.cover_image, 'cover_image_key', 'delete_cover_image'),
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
          <h2 className="font-display text-[19px] leading-tight">{t('page.title')}</h2>
          <p className="mt-1 text-[13px] leading-snug text-[var(--muted)]">
            {t('page.description')}
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
            <IconExternalLink aria-hidden className="size-3" />
          </a>
        ) : null}
      </div>

      {formError ? (
        <Alert variant="error" title={t('page.saveFailedTitle')} onDismiss={clearFormError}>
          {formError}
        </Alert>
      ) : null}

      {/* Its own small form, outside the page's save: a new link is a
          deliberate step, confirmed, and the old one keeps forwarding. */}
      {data ? <LinkSection slug={data.slug} publicUrl={publicUrl} /> : null}

      <Form onSubmit={onSubmit}>
        {/* Two columns once there is room, each stacking on its own: in a
            row grid a short card waits for the tall one beside it (opening
            hours) and leaves a hole. Left is what the restaurant is; right is
            how and when to reach it. On a phone they follow one another. */}
        <div className="grid items-start gap-4 xl:grid-cols-2">
          <div className="flex flex-col gap-4">
            <IdentitySection control={form.control} languages={languages} />
            <BrandingSection
              control={form.control}
              currentLogoUrl={data?.logo_url ?? null}
              currentCoverUrl={data?.cover_url ?? null}
            />
            <MoneyTimeSection control={form.control} />
          </div>
          <div className="flex flex-col gap-4">
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
            <OpeningHoursSection control={form.control} />
          </div>
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
            {dirty ? t('page.unsavedChanges') : t('page.allSaved')}
          </span>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              disabled={!dirty || save.isPending}
              onClick={() => data && form.reset(toFormValues(data))}
            >
              {t('page.undoChanges')}
            </Button>
            <Button type="submit" loading={save.isPending} disabled={!dirty}>
              {t('page.saveChanges')}
            </Button>
          </div>
        </FormActions>
      </Form>
    </div>
  )
}
