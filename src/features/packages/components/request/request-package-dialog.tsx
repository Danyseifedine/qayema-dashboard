import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { Form, FormActions, TextareaField } from '@/shared/components/forms'
import { Alert, Button } from '@/shared/components/ui'
import type { Locale } from '@/shared/constants/locales'
import { useApiFormErrors } from '@/shared/hooks/use-api-form-errors'
import { cn } from '@/shared/utils/dom/cn'
import { translated } from '@/shared/utils/string/translated'
import { useRequestPackage } from '../../hooks/use-packages'
import {
  requestPackageFormSchema,
  type Package,
  type RequestPackageFormValues,
} from '../../schemas/package.schema'

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
  const ref = useRef<HTMLDialogElement>(null)
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

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const name = pkg === null ? '' : translated(pkg.name, locale)
  const label = pkg === null ? '' : name === '' || name.missing ? pkg.slug : name.text

  const onSubmit = form.handleSubmit((values) => {
    if (pkg === null) return
    clearFormError()
    send.mutate(
      { package: pkg.slug, ...(values.message ? { message: values.message } : {}) },
      { onSuccess: onClose, onError: (error) => applyApiError(error) },
    )
  })

  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault()
        if (!send.isPending) onClose()
      }}
      onClick={(event) => {
        if (event.target === ref.current && !send.isPending) onClose()
      }}
      className={cn(
        'm-auto w-[min(92vw,460px)] rounded-[16px] border-[0.5px] border-[var(--line)] p-0',
        'bg-[var(--surface)] text-[var(--text)] shadow-pop',
      )}
    >
      <Form onSubmit={onSubmit} className="gap-0">
        <div className="p-5 pb-0">
          <h2 className="font-display text-[19px] leading-tight">Ask about {label}</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--muted)]">
            We will read this and reply by email to set your package up. Nothing changes and nothing
            is charged until then.
          </p>

          {formError ? (
            <Alert variant="error" className="mt-3">
              {formError}
            </Alert>
          ) : null}

          <TextareaField
            control={form.control}
            name="message"
            label="Anything we should know?"
            optionalText="optional"
            rows={4}
            maxLength={2000}
            placeholder="How many restaurants, how big your menu is, when you need it."
          />
        </div>

        <FormActions className="mt-4 border-t-[0.5px] border-[var(--line)] p-3.5">
          <Button variant="ghost" onClick={onClose} disabled={send.isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={send.isPending} disabled={pkg === null}>
            Send request
          </Button>
        </FormActions>
      </Form>
    </dialog>
  )
}
