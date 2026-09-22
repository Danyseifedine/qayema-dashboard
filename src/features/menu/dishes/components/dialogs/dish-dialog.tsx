import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import {
  ComboboxField,
  FieldGroup,
  Form,
  FormActions,
  ImageField,
  PriceField,
  SwitchField,
  TranslatableTextField,
} from '@/shared/components/forms'
import { Alert, Button } from '@/shared/components/ui'
import type { Locale } from '@/shared/constants/locales'
import { useApiFormErrors } from '@/shared/hooks/use-api-form-errors'
import { cn } from '@/shared/utils/dom/cn'
import { translated } from '@/shared/utils/string/translated'
import type { Category } from '../../../categories/schemas/category.schema'
import { useSaveDish } from '../../hooks/use-dishes'
import {
  dishFormSchema,
  type Dish,
  type DishFormInput,
  type DishFormValues,
} from '../../schemas/dish.schema'

export type DishDialogProps = {
  open: boolean
  /** Null creates a new dish. */
  dish: Dish | null
  categories: Category[]
  /** Preselected category when adding from a filtered view. */
  defaultCategoryId: number | null
  currency: string
  locale: Locale
  onClose: () => void
  /** A dish needs a category; this sends the owner off to make one. */
  onOpenCategories: () => void
}

export function DishDialog({
  open,
  dish,
  categories,
  defaultCategoryId,
  currency,
  locale,
  onClose,
  onOpenCategories,
}: DishDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const save = useSaveDish(dish?.id ?? null)

  const form = useForm<DishFormInput, unknown, DishFormValues>({
    resolver: zodResolver(dishFormSchema),
    defaultValues: {
      name: { en: '', ar: '' },
      ingredients: { en: '', ar: '' },
      price: null,
      category_id: defaultCategoryId ?? categories[0]?.id ?? null,
      is_available: true,
      image: null,
      delete_image: false,
    },
  })

  const { formError, applyApiError, clearFormError } = useApiFormErrors(form.setError)

  // Kept current every render so the reset below can read them without
  // taking them as dependencies.
  const categoriesRef = useRef(categories)
  const dishRef = useRef(dish)
  useEffect(() => {
    categoriesRef.current = categories
    dishRef.current = dish
  })

  // Only a genuine open, or a switch to a different dish, refills the form.
  // Depending on the `categories` array re-ran this on every parent render
  // and silently wiped whatever the owner had typed.
  const dishId = dish?.id ?? null
  useEffect(() => {
    if (!open) return
    const current = dishRef.current
    clearFormError()
    form.reset({
      name: { en: current?.name.en ?? '', ar: current?.name.ar ?? '' },
      ingredients: { en: current?.ingredients.en ?? '', ar: current?.ingredients.ar ?? '' },
      price: current?.price === null || current?.price === undefined ? null : Number(current.price),
      category_id:
        current?.category_id ?? defaultCategoryId ?? categoriesRef.current[0]?.id ?? null,
      is_available: current?.is_available ?? true,
      image: null,
      delete_image: false,
    })
  }, [open, dishId, defaultCategoryId, form, clearFormError])

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const onSubmit = form.handleSubmit((values) => {
    clearFormError()
    save.mutate(
      {
        name: values.name,
        ingredients: values.ingredients,
        price: values.price,
        category_id: values.category_id,
        is_available: values.is_available,
        // Only send a key when one was uploaded in this session.
        ...(values.image ? { image_key: values.image.key } : {}),
        ...(values.delete_image ? { delete_image: true } : {}),
      },
      { onSuccess: onClose, onError: (error) => applyApiError(error) },
    )
  })

  const options = categories.map((category) => {
    const name = translated(category.name, locale)
    return { value: String(category.id), label: name.missing ? 'Untitled category' : name.text }
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
        'm-auto max-h-[90dvh] w-[min(94vw,560px)] overflow-y-auto rounded-[16px] p-0',
        'border-[0.5px] border-[var(--line)] bg-[var(--surface)] text-[var(--text)]',
        'shadow-pop',
      )}
    >
      <Form onSubmit={onSubmit} className="gap-0">
        <div className="p-5 pb-0">
          <h2 className="font-display text-[19px] leading-tight">
            {dish ? 'Edit dish' : 'New dish'}
          </h2>

          {formError ? (
            <Alert variant="error" className="mt-3">
              {formError}
            </Alert>
          ) : null}

          {options.length === 0 ? (
            <Alert variant="warning" title="Add a category first" className="mt-3">
              Every dish belongs to a category.
              <div className="mt-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    onClose()
                    onOpenCategories()
                  }}
                >
                  Go to categories
                </Button>
              </div>
            </Alert>
          ) : null}

          <TranslatableTextField
            control={form.control}
            name="name"
            label="Name"
            required
            maxLength={255}
            placeholder={{ en: 'Lamb shank', ar: 'موزات الغنم' }}
          />

          <TranslatableTextField
            control={form.control}
            name="ingredients"
            label="Ingredients"
            multiline
            rows={3}
            maxLength={2000}
            optionalText="optional"
            hint="Free text, shown under the dish on your menu."
          />

          <FieldGroup>
            <PriceField
              control={form.control}
              name="price"
              currency={currency}
              label="Price"
              hint="Leave empty to hide the price."
            />
            <ComboboxField
              control={form.control}
              name="category_id"
              label="Category"
              required
              numeric
              searchable={false}
              options={options}
              disabled={options.length === 0}
              placeholder={options.length === 0 ? 'Add a category first' : 'Choose a category'}
            />
          </FieldGroup>

          <ImageField
            control={form.control}
            name="image"
            label="Photo"
            optionalText="optional"
            context="dish"
            currentUrl={dish?.image_url ?? null}
            hint="Cropped to 1200 x 900 and converted to WebP."
          />

          <SwitchField
            control={form.control}
            name="is_available"
            label="Available"
            description="Turn this off to keep the dish on your menu but marked sold out."
          />
        </div>

        <FormActions className="mt-4 border-t-[0.5px] border-[var(--line)] p-3.5">
          <Button variant="ghost" onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={save.isPending}
            disabled={options.length === 0}
            title={options.length === 0 ? 'Add a category first' : undefined}
          >
            {dish ? 'Save dish' : 'Add dish'}
          </Button>
        </FormActions>
      </Form>
    </dialog>
  )
}
