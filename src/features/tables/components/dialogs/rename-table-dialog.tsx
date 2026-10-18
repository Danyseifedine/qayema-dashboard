import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Modal, ModalFooter, ModalHeader } from '@/shared/components/feedback'
import { Form, TextField } from '@/shared/components/forms'
import { Alert, Button } from '@/shared/components/ui'
import { useApiFormErrors } from '@/shared/hooks/use-api-form-errors'
import { useSubmitOnce } from '@/shared/hooks/use-submit-once'
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
    <Modal open={open} onClose={onClose} busy={rename.isPending} size="sm">
      <Form onSubmit={onSubmit} className="gap-0">
        <div className="flex flex-col gap-3 p-5 pb-0">
          <ModalHeader
            title={t('dialog.renameTitle')}
            description={t('dialog.renameDescription')}
          />
          {formError ? <Alert variant="error">{formError}</Alert> : null}
          <TextField
            control={form.control}
            name="name"
            label={t('dialog.name')}
            placeholder={t('dialog.namePlaceholder')}
            required
            maxLength={TABLE_NAME_MAX}
          />
        </div>
        <ModalFooter>
          <Button variant="ghost" onClick={onClose} disabled={rename.isPending}>
            {t('dialog.cancel')}
          </Button>
          <Button type="submit" loading={rename.isPending}>
            {t('dialog.save')}
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}
