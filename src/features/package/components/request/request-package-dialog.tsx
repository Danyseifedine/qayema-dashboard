import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Modal, ModalFooter, ModalHeader } from '@/shared/components/feedback'
import { Form, TextareaField } from '@/shared/components/forms'
import { Alert, Button } from '@/shared/components/ui'
import type { Locale } from '@/shared/constants/locales'
import { useApiFormErrors } from '@/shared/hooks/use-api-form-errors'
import { useSubmitOnce } from '@/shared/hooks/use-submit-once'
import { translated } from '@/shared/utils/string/translated'
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
}

const EMPTY: RequestPackageFormValues = { message: '' }

/**
 * Asks for a package.
 *
 * This sends a message, not a payment: an admin reads it and assigns the
 * package, so the copy promises a reply rather than an upgrade.
 */
export function RequestPackageDialog({ open, pkg, locale, onClose }: RequestPackageDialogProps) {
  const { t } = useTranslation('package')
  const send = useRequestPackage()

  const form = useForm<RequestPackageFormValues>({
    resolver: zodResolver(requestPackageFormSchema),
    defaultValues: EMPTY,
  })

  const { formError, applyApiError, clearFormError } = useApiFormErrors(form.setError)

  // Reset whenever the dialog opens, so a previous note never leaks in.
  useEffect(() => {
    if (!open) return
    clearFormError()
    form.reset(EMPTY)
  }, [open, form, clearFormError])

  const name = pkg === null ? '' : translated(pkg.name, locale)
  const label = pkg === null ? '' : name === '' || name.missing ? pkg.slug : name.text

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
    <Modal open={open} onClose={onClose} busy={send.isPending}>
      <Form onSubmit={onSubmit} className="gap-0">
        <div className="p-5 pb-0">
          <ModalHeader
            title={t('request.title', { name: label })}
            description={t('request.description')}
          />

          {formError ? (
            <Alert variant="error" className="mt-3">
              {formError}
            </Alert>
          ) : null}

          <TextareaField
            control={form.control}
            name="message"
            label={t('request.messageLabel')}
            optionalText={t('request.optional')}
            rows={4}
            maxLength={2000}
            placeholder={t('request.placeholder')}
          />
        </div>

        <ModalFooter>
          <Button variant="ghost" onClick={onClose} disabled={send.isPending}>
            {t('request.cancel')}
          </Button>
          <Button type="submit" loading={send.isPending} disabled={pkg === null}>
            {t('request.submit')}
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}
