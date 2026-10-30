import { z } from 'zod'
import { t } from '@/lib/i18n'
import { menuTextField, menuTextSchema, requireMainLanguage } from '@/shared/utils/string/menu-text'
import { MENU_TEXT_LIMITS } from '@/shared/constants/menu-text-limits'

/**
 * Mirrors ../qayema/app/Http/Resources/CategoryResource.php and the
 * Store/Update request rules. Names are maps with one entry per menu
 * language, never plain strings.
 */
const categorySchema = z.object({
  id: z.number().int(),
  name: menuTextSchema,
  /** One optional line under the heading on the public menu. */
  description: menuTextSchema,
  /** One of the menu's category icons (constants/category-icons.ts), or none. */
  icon: z.string().nullable(),
  // Always sent in practice, but the resource marks it conditional.
  dishes_count: z.number().int().optional(),
  /** Connect to POS: made by the POS, and since removed there (hidden on the menu). */
  from_pos: z.boolean().default(false),
  pos_removed: z.boolean().default(false),
})

/** The index adds a usage/limit block; reorder does not. */
export const categoryListSchema = z.object({
  data: z.array(categorySchema),
  meta: z.object({
    used: z.number().int(),
    /** Null means unlimited on this package. */
    limit: z.number().int().nullable(),
  }),
})

export const categoryCollectionSchema = z.object({ data: z.array(categorySchema) })

export const categoryResponseSchema = z.object({ data: categorySchema })

export type Category = z.infer<typeof categorySchema>
export type CategoryList = z.infer<typeof categoryListSchema>

/**
 * Form input, one entry per menu language. The server requires the name in
 * the menu's main language, so the same rule is applied here rather than
 * waiting for the 422; `anyLanguage` while saving translates it in.
 */
export function makeCategoryFormSchema(anyLanguage = false) {
  return z
    .object({
      name: menuTextField(MENU_TEXT_LIMITS.categoryName, () => t('menu:fields.name')),
      description: menuTextField(MENU_TEXT_LIMITS.categoryDescription, () =>
        t('menu:fields.description'),
      ),
      icon: z.string().nullable(),
    })
    .superRefine(
      (values, ctx) =>
        requireMainLanguage(
          values.name,
          'name',
          (language) => t('menu:categorySchema.nameRequired', { language }),
          ctx,
          anyLanguage,
        ),
      // Also when the description is wrong, so one submit shows both.
      { when: () => true },
    )
}

export const categoryFormSchema = makeCategoryFormSchema()

export type CategoryFormValues = z.infer<typeof categoryFormSchema>
