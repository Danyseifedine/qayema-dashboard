import { z } from 'zod'
import { t } from '@/lib/i18n'

/**
 * Mirrors ../qayema/app/Http/Resources/DiningTableResource.php and the meta
 * of DiningTableController::index().
 */
export const diningTableSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  /** What the table's QR code carries. Random, so it cannot be guessed. */
  code: z.string(),
  /** What the table's QR code opens: the menu, at this table. */
  url: z.string(),
})

export type DiningTable = z.infer<typeof diningTableSchema>

export const tableListSchema = z.object({
  data: z.array(diningTableSchema),
  meta: z.object({
    limit: z.number().int(),
    /** Whether guests can order to a table now, or only open the menu from it. */
    takes_orders: z.boolean(),
  }),
})

export type TableList = z.infer<typeof tableListSchema>

export const tablesResponseSchema = z.object({ data: z.array(diningTableSchema) })
export const tableResponseSchema = z.object({ data: diningTableSchema })

/** As ../qayema/config/menu.php caps it. */
export const TABLE_NAME_MAX = 40
export const TABLES_PER_ADD = 100

/** A table's name, as the rename dialog asks for it. */
export const tableNameFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: () => t('tables:dialog.nameMissing') })
    .max(TABLE_NAME_MAX, { error: () => t('tables:dialog.nameMax', { max: TABLE_NAME_MAX }) }),
})

export type TableNameFormValues = z.infer<typeof tableNameFormSchema>

/**
 * Adding tables: a numbered run ("Table 1" to "Table 12"), or one with a
 * name of its own. The numbers are typed, so they arrive as text.
 */
export const addTablesFormSchema = z
  .object({
    mode: z.enum(['numbered', 'single']),
    prefix: z
      .string()
      .trim()
      .max(TABLE_NAME_MAX - 4, {
        error: () => t('tables:dialog.nameMax', { max: TABLE_NAME_MAX - 4 }),
      }),
    from: z.string().trim(),
    to: z.string().trim(),
    name: z.string().trim(),
  })
  .superRefine((values, context) => {
    if (values.mode === 'single') {
      if (values.name === '') {
        context.addIssue({
          code: 'custom',
          path: ['name'],
          message: t('tables:dialog.nameMissing'),
        })
      } else if (values.name.length > TABLE_NAME_MAX) {
        context.addIssue({
          code: 'custom',
          path: ['name'],
          message: t('tables:dialog.nameMax', { max: TABLE_NAME_MAX }),
        })
      }
      return
    }

    const from = /^\d{1,4}$/.test(values.from) ? Number(values.from) : null
    const to = /^\d{1,4}$/.test(values.to) ? Number(values.to) : null

    if (from === null) {
      context.addIssue({
        code: 'custom',
        path: ['from'],
        message: t('tables:dialog.numberInvalid'),
      })
    }
    if (to === null) {
      context.addIssue({ code: 'custom', path: ['to'], message: t('tables:dialog.numberInvalid') })
    }
    if (from === null || to === null) return

    if (to < from) {
      context.addIssue({ code: 'custom', path: ['to'], message: t('tables:dialog.rangeInvalid') })
    } else if (to - from + 1 > TABLES_PER_ADD) {
      context.addIssue({
        code: 'custom',
        path: ['to'],
        message: t('tables:dialog.rangeTooBig', { max: TABLES_PER_ADD }),
      })
    }
  })

export type AddTablesFormValues = z.infer<typeof addTablesFormSchema>
