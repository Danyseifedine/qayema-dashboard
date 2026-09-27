import { z } from 'zod'
import { request } from '@/lib/api'
import type { MenuTextForm } from '@/shared/utils/string/menu-text'
import {
  categoryCollectionSchema,
  categoryListSchema,
  categoryResponseSchema,
  type Category,
  type CategoryList,
} from '../schemas/category.schema'

/** One entry per menu language; a blank one clears that language. */
export type CategoryPayload = {
  name: MenuTextForm
  description: MenuTextForm
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
 * Every menu language is sent each time; a blank one clears that language.
 * Text in a language the menu no longer uses is never sent, so the server
 * keeps it for if the owner switches back.
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
