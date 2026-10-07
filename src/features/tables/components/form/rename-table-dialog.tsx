import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Form, FormActions, TextField } from '@/shared/components/forms'
import { Alert, Button } from '@/shared/components/ui'
import { useApiFormErrors } from '@/shared/hooks/use-api-form-errors'
import { useSubmitOnce } from '@/shared/hooks/use-submit-once'
import { cn } from '@/shared/utils/dom/cn'
import { useRenameTable } from '@/features/tables/hooks/use-tables'
import {
  TABLE_NAME_MAX,
  tableNameFormSchema,
  type DiningTable,
  type TableNameFormValues,
} from '@/features/tables/schemas/table.schema'

export type RenameTableDialogProps = {
  /** Null keeps it closed. */
  table: DiningTable | null
  onClose: () => void
}

/** A new name; the table keeps its code, so its printed card still works. */
export function RenameTableDialog({ table, onClose }: RenameTableDialogProps) {
  const { t } = useTranslation('tables')
  const ref = useRef<HTMLDialogElement>(null)
  const rename = useRenameTable()
  const open = table !== null

  const form = useForm<TableNameFormValues>({
    resolver: zodResolver(tableNameFormSchema),
    defaultValues: { name: '' },
  })
  const { formError, applyApiError, clearFormError } = useApiFormErrors(form.setError)

  useEffect(() => {
    if (!table) return
    clearFormError()
    form.reset({ name: table.name })
  }, [table, form, clearFormError])

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const once = useSubmitOnce()

  const onSubmit = form.handleSubmit((values) =>
    once((done) => {
      if (!table) return done()
      clearFormError()
      rename.mutate(
        { id: table.id, name: values.name },
        { onSuccess: onClose, onError: (error) => applyApiError(error), onSettled: done },
      )
    }),
  )

  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault()
        if (!rename.isPending) onClose()
      }}
      onClick={(event) => {
        if (event.target === ref.current && !rename.isPending) onClose()
      }}
      className={cn(
        'm-auto w-[min(92vw,420px)] rounded-[16px] border-[0.5px] border-[var(--line)] p-0',
        'bg-[var(--surface)] text-[var(--text)] shadow-pop',
      )}
    >
      <Form onSubmit={onSubmit} className="gap-0">
        <div className="flex flex-col gap-3 p-5 pb-0">
          <div>
            <h2 className="font-display text-[19px] leading-tight">{t('dialog.renameTitle')}</h2>
            <p className="mt-1.5 text-[13px] leading-snug text-[var(--muted)]">
              {t('dialog.renameDescription')}
            </p>
          </div>
          {formError ? <Alert variant="error">{formError}</Alert> : null}
          <TextField
            control={form.control}
            name="name"
            label={t('dialog.name')}
            required
            maxLength={TABLE_NAME_MAX}
          />
        </div>
        <FormActions className="mt-4 border-t-[0.5px] border-[var(--line)] p-3.5">
          <Button variant="ghost" onClick={onClose} disabled={rename.isPending}>
            {t('dialog.cancel')}
          </Button>
          <Button type="submit" loading={rename.isPending}>
            {t('dialog.save')}
          </Button>
        </FormActions>
      </Form>
    </dialog>
  )
}
