import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { FormDialog } from '@/shared/components/feedback'
import { TextareaField } from '@/shared/components/forms'
import type { Locale } from '@/shared/constants/locales'
import { useApiFormErrors } from '@/shared/hooks/use-api-form-errors'
import { useSubmitOnce } from '@/shared/hooks/use-submit-once'
import { nameOr } from '@/shared/utils/string/translated'
import { useRequestPackage } from '@/features/package/hooks/use-packages'
import {
  requestPackageFormSchema,
  type Package,
  type RequestPackageFormValues,
} from '@/features/package/schemas/package.schema'

export type RequestPackageDialogProps = {
  open: boolean
  /** Null when no package has been picked yet. */
  pkg: Package | null
  locale: Locale
  onClose: () => void
  /** In place of "Ask about <package>", for a request about something else. */
  title?: string
  description?: string
  /** The note the form opens with, which the owner can change. */
  message?: string
}

/**
 * Asks for a package.
 *
 * This sends a message, not a payment: an admin reads it and assigns the
 * package, so the copy promises a reply rather than an upgrade.
 */
export function RequestPackageDialog({
  open,
  pkg,
  locale,
  onClose,
  title,
  description,
  message = '',
}: RequestPackageDialogProps) {
  const { t } = useTranslation('package')
  const send = useRequestPackage()

  const form = useForm<RequestPackageFormValues>({
    resolver: zodResolver(requestPackageFormSchema),
    defaultValues: { message },
  })

  const { formError, applyApiError, clearFormError } = useApiFormErrors(form.setError)

  // Reset whenever the dialog opens, so a previous note never leaks in.
  useEffect(() => {
    if (!open) return
    clearFormError()
    form.reset({ message })
  }, [open, message, form, clearFormError])

  const label = pkg === null ? '' : nameOr(pkg.name, locale, pkg.slug)

  // Each request counts against the owner's three a day.
  const once = useSubmitOnce()

  const onSubmit = form.handleSubmit((values) => {
    if (pkg === null) return
    once((done) => {
      clearFormError()
      send.mutate(
        { package: pkg.slug, ...(values.message ? { message: values.message } : {}) },
        { onSuccess: onClose, onError: (error) => applyApiError(error), onSettled: done },
      )
    })
  })

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      busy={send.isPending}
      title={title ?? t('request.title', { name: label })}
      description={description ?? t('request.description')}
      error={formError}
      onSubmit={onSubmit}
      submitLabel={t('request.submit')}
      // Nothing to ask about yet: no tooltip, just a button that waits.
      submitBlocked={pkg === null ? '' : undefined}
    >
      <TextareaField
        control={form.control}
        name="message"
        label={t('request.messageLabel')}
        optionalText={t('request.optional')}
        rows={4}
        maxLength={2000}
        placeholder={t('request.placeholder')}
      />
    </FormDialog>
  )
}
