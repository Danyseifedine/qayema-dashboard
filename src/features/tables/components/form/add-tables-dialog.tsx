import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Form, FormActions, TextField } from '@/shared/components/forms'
import { Alert, Button, Segmented } from '@/shared/components/ui'
import { useApiFormErrors } from '@/shared/hooks/use-api-form-errors'
import { useSubmitOnce } from '@/shared/hooks/use-submit-once'
import { cn } from '@/shared/utils/dom/cn'
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
  const ref = useRef<HTMLDialogElement>(null)
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

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

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
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault()
        if (!add.isPending) onClose()
      }}
      onClick={(event) => {
        if (event.target === ref.current && !add.isPending) onClose()
      }}
      className={cn(
        'm-auto w-[min(92vw,460px)] rounded-[16px] border-[0.5px] border-[var(--line)] p-0',
        'bg-[var(--surface)] text-[var(--text)] shadow-pop',
      )}
    >
      <Form onSubmit={onSubmit} className="gap-0">
        <div className="flex flex-col gap-3 p-5 pb-0">
          <div>
            <h2 className="font-display text-[19px] leading-tight">{t('dialog.addTitle')}</h2>
            <p className="mt-1.5 text-[13px] leading-snug text-[var(--muted)]">
              {t('dialog.addDescription')}
            </p>
          </div>

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

          {formError ? <Alert variant="error">{formError}</Alert> : null}

          {mode === 'numbered' ? (
            <>
              <div className="grid grid-cols-[minmax(0,1fr)_84px_84px] items-start gap-2.5">
                <TextField
                  control={form.control}
                  name="prefix"
                  label={t('dialog.prefix')}
                  maxLength={TABLE_NAME_MAX - 4}
                />
                <TextField
                  control={form.control}
                  name="from"
                  label={t('dialog.from')}
                  inputMode="numeric"
                  forceLtr
                />
                <TextField
                  control={form.control}
                  name="to"
                  label={t('dialog.to')}
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

        <FormActions className="mt-4 border-t-[0.5px] border-[var(--line)] p-3.5">
          <Button variant="ghost" onClick={onClose} disabled={add.isPending}>
            {t('dialog.cancel')}
          </Button>
          <Button type="submit" loading={add.isPending}>
            {mode === 'numbered' && preview.length > 1
              ? t('dialog.addMany', { count: preview.length })
              : t('dialog.addOne')}
          </Button>
        </FormActions>
      </Form>
    </dialog>
  )
}
