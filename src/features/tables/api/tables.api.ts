import { z } from 'zod'
import { request } from '@/lib/api'
import {
  tableListSchema,
  tableResponseSchema,
  tablesResponseSchema,
  type DiningTable,
  type TableList,
} from '@/features/tables/schemas/table.schema'

export function fetchTables(signal?: AbortSignal): Promise<TableList> {
  return request(tableListSchema, { method: 'GET', url: '/api/tables', signal })
}

/** One table or many at once; each name must be new to the restaurant. */
export async function createTables(names: string[]): Promise<DiningTable[]> {
  const { data } = await request(tablesResponseSchema, {
    method: 'POST',
    url: '/api/tables',
    data: { names },
  })
  return data
}

export async function renameTable(id: number, name: string): Promise<DiningTable> {
  const { data } = await request(tableResponseSchema, {
    method: 'PATCH',
    url: `/api/tables/${id}`,
    data: { name },
  })
  return data
}

/** A new code: the table's printed QR code stops working. */
export async function newTableCode(id: number): Promise<DiningTable> {
  const { data } = await request(tableResponseSchema, {
    method: 'POST',
    url: `/api/tables/${id}/new-code`,
  })
  return data
}

/** 204. Orders made at it keep the table's name. */
export async function deleteTable(id: number): Promise<void> {
  await request(z.unknown(), { method: 'DELETE', url: `/api/tables/${id}` })
}
