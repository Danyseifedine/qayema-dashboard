import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { Form, FormActions, TranslatableTextField } from '@/shared/components/forms'
import { Alert, Button } from '@/shared/components/ui'
import { useApiFormErrors } from '@/shared/hooks/use-api-form-errors'
import { cn } from '@/shared/utils/dom/cn'
import {
  categoryFormSchema,
  type Category,
  type CategoryFormValues,
} from '../../schemas/category.schema'
import { useSaveCategory } from '../../hooks/use-categories'

export type CategoryDialogProps = {
  open: boolean
  /** Null creates a new category. */
  category: Category | null
  onClose: () => void
}

const EMPTY: CategoryFormValues = { name: { en: '', ar: '' }, description: { en: '', ar: '' } }

/** Create or edit a category. A name in either language is enough; the description is optional. */
export function CategoryDialog({ open, category, onClose }: CategoryDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const save = useSaveCategory(category?.id ?? null)

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: EMPTY,
  })

  const { formError, applyApiError, clearFormError } = useApiFormErrors(form.setError)

  // Reset whenever the dialog opens, so a previous edit never leaks in.
  useEffect(() => {
    if (!open) return
    clearFormError()
    form.reset(
      category
        ? {
            name: { en: category.name.en ?? '', ar: category.name.ar ?? '' },
            description: {
              en: category.description.en ?? '',
              ar: category.description.ar ?? '',
            },
          }
        : EMPTY,
    )
  }, [open, category, form, clearFormError])

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const onSubmit = form.handleSubmit((values) => {
    clearFormError()
    save.mutate(values, {
      onSuccess: onClose,
      onError: (error) => applyApiError(error),
    })
  })

  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault()
        if (!save.isPending) onClose()
      }}
      onClick={(event) => {
        if (event.target === ref.current && !save.isPending) onClose()
      }}
      className={cn(
        'm-auto w-[min(92vw,460px)] rounded-[16px] border-[0.5px] border-[var(--line)] p-0',
        'bg-[var(--surface)] text-[var(--text)] shadow-pop',
      )}
    >
      <Form onSubmit={onSubmit} className="gap-0">
        <div className="p-5 pb-0">
          <h2 className="font-display text-[19px] leading-tight">
            {category ? 'Edit category' : 'New category'}
          </h2>

          {formError ? (
            <Alert variant="error" className="mt-3">
              {formError}
            </Alert>
          ) : null}

          <TranslatableTextField
            control={form.control}
            name="name"
            label="Name"
            required
            maxLength={255}
            placeholder={{ en: 'Starters', ar: 'المقبلات' }}
            hint="One language is enough; the other can be added later."
          />

          <TranslatableTextField
            control={form.control}
            name="description"
            label="Description"
            multiline
            rows={2}
            maxLength={300}
            optionalText="optional"
            placeholder={{ en: 'Served from noon until close', ar: 'تقدّم من الظهر حتى الإغلاق' }}
            hint="One line under the heading on your menu."
          />
        </div>

        <FormActions className="mt-4 border-t-[0.5px] border-[var(--line)] p-3.5">
          <Button variant="ghost" onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending}>
            {category ? 'Save' : 'Add category'}
          </Button>
        </FormActions>
      </Form>
    </dialog>
  )
}
