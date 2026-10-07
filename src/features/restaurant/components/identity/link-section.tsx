import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { t as translate } from '@/lib/i18n'
import { ConfirmDialog } from '@/shared/components/feedback'
import { FormSection, TextField } from '@/shared/components/forms'
import { Button } from '@/shared/components/ui'
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
  const { formError, applyApiError } = useApiFormErrors(form.setError)

  // A link changed (here, or by an admin) is the new starting point.
  useEffect(() => {
    form.reset({ slug })
  }, [slug, form])

  const typed = form.watch('slug').trim()
  const unchanged = typed === slug

  return (
    <FormSection title={t('link.title')} description={t('link.description')}>
      <form
        noValidate
        onSubmit={form.handleSubmit((values) => setAsking(values.slug.trim()))}
        className="flex flex-col gap-3 sm:flex-row sm:items-start"
      >
        <TextField
          control={form.control}
          name="slug"
          label={t('link.label')}
          hint={formError ?? t('link.hint')}
          leadingIcon={<span className="text-[13px] text-[var(--muted)]">{host}</span>}
          forceLtr
          autoComplete="off"
          className="flex-1"
        />
        <Button type="submit" variant="secondary" disabled={unchanged} className="sm:mt-9">
          {t('link.change')}
        </Button>
      </form>

      <ConfirmDialog
        open={asking !== null}
        loading={change.isPending}
        title={t('link.confirmTitle')}
        description={t('link.confirmBody', { link: `${host}${asking ?? ''}` })}
        confirmLabel={t('link.confirm')}
        onCancel={() => setAsking(null)}
        onConfirm={() => {
          if (asking === null) return
          change.mutate(asking, {
            onSuccess: () => setAsking(null),
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
