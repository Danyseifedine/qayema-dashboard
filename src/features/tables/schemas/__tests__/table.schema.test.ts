import { describe, expect, it } from 'vitest'
import {
  addTablesFormSchema,
  tableListSchema,
  tableNameFormSchema,
} from '@/features/tables/schemas/table.schema'

function messages(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.success ? [] : (result.error?.issues.map((issue) => issue.message) ?? [])
}

function paths(result: {
  success: boolean
  error?: { issues: { path: PropertyKey[] }[] }
}): string[] {
  return result.success ? [] : (result.error?.issues.map((issue) => issue.path.join('.')) ?? [])
}

describe('tableListSchema', () => {
  it('reads the list with its limit and whether it takes orders', () => {
    const list = {
      data: [{ id: 1, name: 'Table 1', code: 'abc', url: 'http://localhost/olive?table=abc&qr=1' }],
      meta: { limit: 300, takes_orders: false },
    }
    expect(tableListSchema.parse(list)).toEqual(list)
  })

  it('refuses a table without its code', () => {
    expect(
      tableListSchema.safeParse({
        data: [{ id: 1, name: 'Table 1', url: 'x' }],
        meta: { limit: 300, takes_orders: true },
      }).success,
    ).toBe(false)
  })
})

describe('tableNameFormSchema', () => {
  it('accepts a name and trims it', () => {
    expect(tableNameFormSchema.parse({ name: '  Terrace  ' })).toEqual({ name: 'Terrace' })
  })

  it('asks for a name when it is blank', () => {
    expect(messages(tableNameFormSchema.safeParse({ name: '   ' }))).toEqual([
      'Give the table a name.',
    ])
  })

  it('refuses a name over 40 characters', () => {
    expect(messages(tableNameFormSchema.safeParse({ name: 'x'.repeat(41) }))).toEqual([
      'Keep the name under 40 characters.',
    ])
  })
})

describe('addTablesFormSchema', () => {
  const numbered = { mode: 'numbered' as const, prefix: 'Table', from: '1', to: '10', name: '' }
  const single = { mode: 'single' as const, prefix: '', from: '', to: '', name: 'Terrace' }

  it('accepts a numbered run and trims what was typed', () => {
    expect(addTablesFormSchema.parse({ ...numbered, prefix: ' Table ', from: ' 1 ' })).toEqual(
      numbered,
    )
  })

  it('accepts one table by name, whatever the numbers say', () => {
    expect(addTablesFormSchema.safeParse({ ...single, from: 'x', to: 'y' }).success).toBe(true)
  })

  it('asks for the name of a single table', () => {
    const result = addTablesFormSchema.safeParse({ ...single, name: '  ' })
    expect(messages(result)).toEqual(['Give the table a name.'])
    expect(paths(result)).toEqual(['name'])
  })

  it('refuses a single name over 40 characters', () => {
    const result = addTablesFormSchema.safeParse({ ...single, name: 'x'.repeat(41) })
    expect(messages(result)).toEqual(['Keep the name under 40 characters.'])
    expect(paths(result)).toEqual(['name'])
  })

  it('leaves room for the number after the prefix', () => {
    const result = addTablesFormSchema.safeParse({ ...numbered, prefix: 'x'.repeat(37) })
    expect(messages(result)).toEqual(['Keep the name under 36 characters.'])
    expect(paths(result)).toEqual(['prefix'])
  })

  it('wants whole numbers at both ends of the run', () => {
    const result = addTablesFormSchema.safeParse({ ...numbered, from: '1.5', to: '' })
    expect(messages(result)).toEqual(['Use a whole number.', 'Use a whole number.'])
    expect(paths(result)).toEqual(['from', 'to'])
  })

  it('refuses a number with more than four digits', () => {
    const result = addTablesFormSchema.safeParse({ ...numbered, from: '1', to: '10000' })
    expect(paths(result)).toEqual(['to'])
  })

  it('refuses a run that ends before it starts', () => {
    const result = addTablesFormSchema.safeParse({ ...numbered, from: '5', to: '4' })
    expect(messages(result)).toEqual([
      'Check the numbers: "To" has to be the same as "From" or higher.',
    ])
  })

  it('takes up to 100 tables at a time, not one more', () => {
    expect(addTablesFormSchema.safeParse({ ...numbered, from: '1', to: '100' }).success).toBe(true)
    const result = addTablesFormSchema.safeParse({ ...numbered, from: '1', to: '101' })
    expect(messages(result)).toEqual(['Add up to 100 tables at a time.'])
    expect(paths(result)).toEqual(['to'])
  })
})
