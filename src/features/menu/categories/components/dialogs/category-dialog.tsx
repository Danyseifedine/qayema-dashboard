import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo } from 'react'
import { useForm, useWatch, type FieldPath } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { FormDialog } from '@/shared/components/feedback'
import { OneLanguageNote, TranslatableTextField } from '@/shared/components/forms'
import { useApiFormErrors } from '@/shared/hooks/use-api-form-errors'
import { MENU_TEXT_LIMITS } from '@/shared/constants/menu-text-limits'
import {
  makeCategoryFormSchema,
  type Category,
  type CategoryFormValues,
} from '@/features/menu/categories/schemas/category.schema'
import { useSaveCategory } from '@/features/menu/categories/hooks/use-categories'
import { IconPickerField } from '@/features/menu/components/icon-picker-field'
import { useMenuLanguages } from '@/features/auth'
import { Alert } from '@/shared/components/ui'
import { languageDir } from '@/shared/constants/menu-languages'
import { toMenuTextForm } from '@/shared/utils/string/menu-text'
import { useSubmitOnce } from '@/shared/hooks/use-submit-once'
import { useTranslateOnSave } from '@/shared/hooks/use-translate-on-save'
import { missingTranslation } from '@/shared/utils/string/missing-translations'

export type CategoryDialogProps = {
  open: boolean
  /** Null creates a new category. */
  category: Category | null
  onClose: () => void
  /**
   * The menu comes from a POS: its name and description are the POS's,
   * shown and not edited; only the icon is the owner's.
   */
  posManaged?: boolean
}

/** Form values for the menu's languages, from a saved category or blank. */
function toFormValues(category: Category | null, languages: readonly string[]): CategoryFormValues {
  return {
    name: toMenuTextForm(category?.name, languages),
    description: toMenuTextForm(category?.description, languages),
    icon: category?.icon ?? null,
  }
}

/**
 * Create or edit a category. The name is needed in the menu's main
 * language; the description and the icon are optional. Saving fills in, with the writing
 * help, the name or description written in one language only (one AI use).
 */
export function CategoryDialog({
  open,
  category,
  onClose,
  posManaged = false,
}: CategoryDialogProps) {
  const { t } = useTranslation('menu')
  const save = useSaveCategory(category?.id ?? null)
  const languages = useMenuLanguages()

  const translation = useTranslateOnSave(languages)
  // While saving translates, a name in either language will do: the AI
  // fills the main one in (the form reads this on every render).
  const resolver = useMemo(
    () => zodResolver(makeCategoryFormSchema(translation.on)),
    [translation.on],
  )
  const form = useForm<CategoryFormValues>({
    resolver,
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
  const busy = save.isPending || translation.busy

  const onSubmit = form.handleSubmit((values) =>
    once((done) => {
      clearFormError()
      // Only the icon is saved (the server keeps the POS's text): nothing to translate.
      if (posManaged) {
        save.mutate(values, {
          onSuccess: onClose,
          onError: (error) => applyApiError(error),
          onSettled: done,
        })
        return
      }
      const missing = [
        ...missingTranslation(values.name, 'name', languages, MENU_TEXT_LIMITS.categoryName),
        ...missingTranslation(
          values.description,
          'description',
          languages,
          MENU_TEXT_LIMITS.categoryDescription,
        ),
      ]
      translation.fill(values, missing, {
        save: (filled) =>
          save.mutate(filled, {
            onSuccess: onClose,
            onError: (error) => applyApiError(error),
            onSettled: done,
          }),
        show: (path, text) => form.setValue(path as FieldPath<CategoryFormValues>, text),
      })
    }),
  )

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      busy={busy}
      title={category ? t('categoryDialog.titleEdit') : t('categoryDialog.titleNew')}
      error={formError}
      notice={
        posManaged ? (
          <Alert variant="info" size="sm" className="mt-3">
            {t('pos.categoryManaged')}
          </Alert>
        ) : translation.on ? (
          <OneLanguageNote languages={languages} />
        ) : null
      }
      onSubmit={onSubmit}
      submitLabel={category ? t('categoryDialog.save') : t('categoryDialog.add')}
    >
      {posManaged && category ? (
        <dl className="flex flex-col gap-2 text-[13px]" data-pos-managed>
          {(['name', 'description'] as const).map((field) =>
            languages.some((code) => category[field][code]) ? (
              <div key={field}>
                <dt className="text-[var(--muted)]">
                  {field === 'name' ? t('shared.name') : t('categoryDialog.description')}
                </dt>
                {languages.map((code) =>
                  category[field][code] ? (
                    <dd key={code} dir={languageDir(code)} lang={code}>
                      {category[field][code]}
                    </dd>
                  ) : null,
                )}
              </div>
            ) : null,
          )}
        </dl>
      ) : (
        <>
          <TranslatableTextField
            control={form.control}
            name="name"
            languages={languages}
            label={t('shared.name')}
            required
            maxLength={MENU_TEXT_LIMITS.categoryName}
            placeholder={{ en: 'Starters', ar: 'المقبلات' }}
            // The note above says it already when saving translates.
            hint={
              languages.length > 1 && !translation.on ? t('categoryDialog.nameHint') : undefined
            }
          />

          <TranslatableTextField
            control={form.control}
            name="description"
            languages={languages}
            label={t('categoryDialog.description')}
            multiline
            rows={2}
            maxLength={MENU_TEXT_LIMITS.categoryDescription}
            write={{ kind: 'category', name }}
            optionalText={t('shared.optional')}
            placeholder={{
              en: 'Served from noon until close',
              ar: 'تقدّم من الظهر حتى الإغلاق',
            }}
            hint={t('categoryDialog.descriptionHint')}
          />
        </>
      )}

      <IconPickerField
        control={form.control}
        name="icon"
        label={t('categoryDialog.icon')}
        hint={t('categoryDialog.iconHint')}
        optionalText={t('shared.optional')}
      />
    </FormDialog>
  )
}
