import { z } from 'zod'
import { request } from '@/lib/api'
import {
  categoryCollectionSchema,
  categoryListSchema,
  categoryResponseSchema,
  type Category,
  type CategoryList,
} from '../schemas/category.schema'

/** Only non-blank locales are sent; the server drops empty ones anyway. */
export type CategoryPayload = {
  name: { en: string; ar: string }
  description: { en: string; ar: string }
}

export function fetchCategories(signal?: AbortSignal): Promise<CategoryList> {
  return request(categoryListSchema, { method: 'GET', url: '/api/categories', signal })
}

export async function createCategory(payload: CategoryPayload): Promise<Category> {
  const { data } = await request(categoryResponseSchema, {
    method: 'POST',
    url: '/api/categories',
    data: payload,
  })
  return data
}

/**
 * The update rules mark `name` as required, not `sometimes`, so a rename must
 * always send both locales or the missing one is wiped. The description is
 * sent in full every time for the same reason; blanks clear it.
 */
export async function updateCategory(id: number, payload: CategoryPayload): Promise<Category> {
  const { data } = await request(categoryResponseSchema, {
    method: 'PATCH',
    url: `/api/categories/${id}`,
    data: payload,
  })
  return data
}

/** 204. The category's dishes survive, orphaned with a null category. */
export async function deleteCategory(id: number): Promise<void> {
  await request(z.unknown(), { method: 'DELETE', url: `/api/categories/${id}` })
}

/**
 * Reorder takes a flat list of ids; position is the array index. Ids that are
 * not the caller's are skipped server-side. The response is the whole list,
 * renumbered, with no usage meta.
 */
export async function reorderCategories(ids: number[]): Promise<Category[]> {
  const { data } = await request(categoryCollectionSchema, {
    method: 'POST',
    url: '/api/categories/reorder',
    data: { ids },
  })
  return data
}
