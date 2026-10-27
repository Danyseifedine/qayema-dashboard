import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { FormDialog } from '@/shared/components/feedback'
import { TextField } from '@/shared/components/forms'
import { Segmented } from '@/shared/components/ui'
import { useApiFormErrors } from '@/shared/hooks/use-api-form-errors'
import { useSubmitOnce } from '@/shared/hooks/use-submit-once'
import { useAddTables } from '@/features/tables/hooks/use-tables'
import {
  addTablesFormSchema,
  TABLE_NAME_MAX,
  TABLES_PER_ADD,
  type AddTablesFormValues,
} from '@/features/tables/schemas/table.schema'
import {
  firstMessage,
  lastPrefix,
  nextNumber,
  numberedNames,
} from '@/features/tables/utils/table-names'

export type AddTablesDialogProps = {
  open: boolean
  /** The names already taken, to carry on the numbering from them. */
  existing: readonly string[]
  onClose: () => void
}

/**
 * Adds tables: a numbered run ("Table 1" to "Table 12", the usual way a room
 * is set up) or one with a name of its own ("Terrace", "Bar").
 */
export function AddTablesDialog({ open, existing, onClose }: AddTablesDialogProps) {
  const { t } = useTranslation('tables')
  const add = useAddTables()

  const form = useForm<AddTablesFormValues>({
    resolver: zodResolver(addTablesFormSchema),
    defaultValues: { mode: 'numbered', prefix: '', from: '1', to: '10', name: '' },
  })
  const { formError, setFormError, clearFormError } = useApiFormErrors(form.setError)

  // Existing names change identity on every render; read through a ref so
  // the reset below runs on open only, never mid-typing.
  const existingRef = useRef(existing)
  useEffect(() => {
    existingRef.current = existing
  })

  useEffect(() => {
    if (!open) return
    clearFormError()
    const start = nextNumber(existingRef.current)
    form.reset({
      mode: 'numbered',
      prefix: lastPrefix(existingRef.current) ?? t('dialog.defaultPrefix'),
      from: String(start),
      to: String(start + 9),
      name: '',
    })
  }, [open, form, clearFormError, t])

  const [mode, prefix, from, to] = form.watch(['mode', 'prefix', 'from', 'to'])
  const first = Number(from)
  const last = Number(to)
  const count = /^\d+$/.test(from) && /^\d+$/.test(to) ? last - first + 1 : 0
  const preview =
    mode === 'numbered' && count >= 1 && count <= TABLES_PER_ADD
      ? numberedNames(prefix, first, last)
      : []

  const once = useSubmitOnce()

  const onSubmit = form.handleSubmit((values) =>
    once((done) => {
      clearFormError()
      const names =
        values.mode === 'single'
          ? [values.name]
          : numberedNames(values.prefix, Number(values.from), Number(values.to))
      add.mutate(names, {
        onSuccess: onClose,
        // A clash names one table of the run (`names.3`), which has no
        // field of its own here, so it shows above the form.
        onError: (error) => setFormError(firstMessage(error)),
        onSettled: done,
      })
    }),
  )

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      busy={add.isPending}
      title={t('dialog.addTitle')}
      description={t('dialog.addDescription')}
      error={formError}
      onSubmit={onSubmit}
      submitLabel={
        mode === 'numbered' && preview.length > 1
          ? t('dialog.addMany', { count: preview.length })
          : t('dialog.addOne')
      }
    >
      <div className="mt-3 flex flex-col gap-3">
        <Segmented
          aria-label={t('dialog.modeLabel')}
          value={mode}
          onChange={(next) => {
            form.setValue('mode', next)
            form.clearErrors()
            clearFormError()
          }}
          options={[
            { value: 'numbered', label: t('dialog.numbered') },
            { value: 'single', label: t('dialog.single') },
          ]}
        />

        {mode === 'numbered' ? (
          <>
            {/* On a phone the name takes its own row: beside two numbers it
                  was squeezed down to its counter. */}
            <div className="grid grid-cols-2 items-start gap-2.5 sm:grid-cols-[minmax(0,1fr)_84px_84px]">
              <TextField
                className="col-span-2 sm:col-span-1"
                control={form.control}
                name="prefix"
                label={t('dialog.prefix')}
                placeholder={t('dialog.defaultPrefix')}
                maxLength={TABLE_NAME_MAX - 4}
              />
              <TextField
                control={form.control}
                name="from"
                label={t('dialog.from')}
                placeholder="1"
                inputMode="numeric"
                forceLtr
              />
              <TextField
                control={form.control}
                name="to"
                label={t('dialog.to')}
                placeholder="10"
                inputMode="numeric"
                forceLtr
              />
            </div>
            <p className="text-[12.5px] text-[var(--muted)]">
              {preview.length > 0
                ? t('dialog.preview', {
                    count: preview.length,
                    first: preview[0],
                    last: preview[preview.length - 1],
                  })
                : t('dialog.previewNone')}
            </p>
          </>
        ) : (
          <TextField
            control={form.control}
            name="name"
            label={t('dialog.name')}
            required
            maxLength={TABLE_NAME_MAX}
            placeholder={t('dialog.namePlaceholder')}
          />
        )}
      </div>
    </FormDialog>
  )
}
