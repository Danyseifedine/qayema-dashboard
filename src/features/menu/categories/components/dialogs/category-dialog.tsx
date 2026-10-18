import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Modal, ModalFooter, ModalHeader } from '@/shared/components/feedback'
import { Form, TranslatableTextField } from '@/shared/components/forms'
import { Alert, Button } from '@/shared/components/ui'
import { useApiFormErrors } from '@/shared/hooks/use-api-form-errors'
import {
  categoryFormSchema,
  type Category,
  type CategoryFormValues,
} from '@/features/menu/categories/schemas/category.schema'
import { useSaveCategory } from '@/features/menu/categories/hooks/use-categories'
import { useMenuLanguages } from '@/features/auth'
import { toMenuTextForm } from '@/shared/utils/string/menu-text'
import { useSubmitOnce } from '@/shared/hooks/use-submit-once'

export type CategoryDialogProps = {
  open: boolean
  /** Null creates a new category. */
  category: Category | null
  onClose: () => void
}

/** Form values for the menu's languages, from a saved category or blank. */
function toFormValues(category: Category | null, languages: readonly string[]): CategoryFormValues {
  return {
    name: toMenuTextForm(category?.name, languages),
    description: toMenuTextForm(category?.description, languages),
  }
}

/** Create or edit a category. The name is needed in English; the description is optional. */
export function CategoryDialog({ open, category, onClose }: CategoryDialogProps) {
  const { t } = useTranslation('menu')
  const save = useSaveCategory(category?.id ?? null)
  const languages = useMenuLanguages()

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: toFormValues(null, languages),
  })

  const { formError, applyApiError, clearFormError } = useApiFormErrors(form.setError)
  // What "Write with AI" describes.
  const name = useWatch({ control: form.control, name: 'name' })

  // Reset whenever the dialog opens, so a previous edit never leaks in.
  useEffect(() => {
    if (!open) return
    clearFormError()
    form.reset(toFormValues(category, languages))
  }, [open, category, languages, form, clearFormError])

  const once = useSubmitOnce()

  const onSubmit = form.handleSubmit((values) =>
    once((done) => {
      clearFormError()
      save.mutate(values, {
        onSuccess: onClose,
        onError: (error) => applyApiError(error),
        onSettled: done,
      })
    }),
  )

  return (
    <Modal open={open} onClose={onClose} busy={save.isPending}>
      <Form onSubmit={onSubmit} className="gap-0">
        <div className="p-5 pb-0">
          <ModalHeader
            title={category ? t('categoryDialog.titleEdit') : t('categoryDialog.titleNew')}
          />

          {formError ? (
            <Alert variant="error" className="mt-3">
              {formError}
            </Alert>
          ) : null}

          <TranslatableTextField
            control={form.control}
            name="name"
            languages={languages}
            label={t('shared.name')}
            required
            maxLength={255}
            placeholder={{ en: 'Starters', ar: 'المقبلات' }}
            hint={languages.length > 1 ? t('categoryDialog.nameHint') : undefined}
          />

          <TranslatableTextField
            control={form.control}
            name="description"
            languages={languages}
            label={t('categoryDialog.description')}
            multiline
            rows={2}
            maxLength={300}
            write={{ kind: 'category', name }}
            optionalText={t('shared.optional')}
            placeholder={{
              en: 'Served from noon until close',
              ar: 'تقدّم من الظهر حتى الإغلاق',
            }}
            hint={t('categoryDialog.descriptionHint')}
          />
        </div>

        <ModalFooter>
          <Button variant="ghost" onClick={onClose} disabled={save.isPending}>
            {t('shared.cancel')}
          </Button>
          <Button type="submit" loading={save.isPending}>
            {category ? t('categoryDialog.save') : t('categoryDialog.add')}
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}
