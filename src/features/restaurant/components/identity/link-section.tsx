import { IconLink } from '@tabler/icons-react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { t as translate } from '@/lib/i18n'
import { ConfirmDialog } from '@/shared/components/feedback'
import { Form, FormSection, TextField } from '@/shared/components/forms'
import { Alert, Button } from '@/shared/components/ui'
import { useApiFormErrors } from '@/shared/hooks/use-api-form-errors'
import { useChangeSlug } from '@/features/restaurant/hooks/use-restaurant'

const linkSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2, { error: () => translate('restaurant:link.tooShort') })
    .max(100, { error: () => translate('restaurant:link.tooLong') }),
})

type LinkForm = z.infer<typeof linkSchema>

export type LinkSectionProps = {
  /** The menu's link today, e.g. "cedar-and-salt". */
  slug: string
  /** Where the menu is served ("https://qayema.com/cedar-and-salt"), for its host. */
  publicUrl: string | null
}

/**
 * The menu's link, changed on its own rather than with the page's save: it
 * is on printed QR codes. A confirmation says what happens, and the server
 * keeps the old link forwarding to the new one, so nothing printed breaks.
 */
export function LinkSection({ slug, publicUrl }: LinkSectionProps) {
  const { t } = useTranslation('restaurant')
  const change = useChangeSlug()
  const [asking, setAsking] = useState<string | null>(null)
  const host = publicUrl ? `${new URL(publicUrl).host}/` : '/'

  const form = useForm<LinkForm>({
    resolver: zodResolver(linkSchema),
    defaultValues: { slug },
  })
  const { formError, applyApiError, clearFormError } = useApiFormErrors(form.setError)

  // A link changed (here, or by an admin) is the new starting point.
  useEffect(() => {
    form.reset({ slug })
  }, [slug, form])

  const typed = form.watch('slug').trim()
  const unchanged = typed === slug

  return (
    <FormSection
      icon={<IconLink aria-hidden className="size-[18px]" />}
      title={t('link.title')}
      description={t('link.description')}
    >
      {formError ? <Alert variant="error">{formError}</Alert> : null}

      <Form
        onSubmit={form.handleSubmit((values) => setAsking(values.slug.trim()))}
        className="gap-3 sm:flex-row sm:items-start"
      >
        <TextField
          control={form.control}
          name="slug"
          label={t('link.label')}
          placeholder={t('link.placeholder')}
          hint={t('link.hint')}
          leadingIcon={<span className="text-[13px] text-[var(--muted)]">{host}</span>}
          forceLtr
          autoComplete="off"
          className="flex-1"
        />
        <Button type="submit" variant="secondary" disabled={unchanged} className="sm:mt-9">
          {t('link.change')}
        </Button>
      </Form>

      <ConfirmDialog
        open={asking !== null}
        loading={change.isPending}
        title={t('link.confirmTitle')}
        description={t('link.confirmBody', { link: `${host}${asking ?? ''}` })}
        confirmLabel={t('link.confirm')}
        onCancel={() => setAsking(null)}
        onConfirm={() => {
          if (asking === null) return
          clearFormError()
          change.mutate(asking, {
            onSuccess: (saved) => {
              setAsking(null)
              // As the server wrote it: "E2E Place" that cleans to the
              // link it already had changes no prop to reset the box.
              form.reset({ slug: saved.slug })
            },
            onError: (error) => {
              setAsking(null)
              applyApiError(error)
            },
          })
        }}
      />
    </FormSection>
  )
}
