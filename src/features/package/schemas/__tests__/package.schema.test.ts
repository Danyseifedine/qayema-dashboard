import { describe, expect, it } from 'vitest'
import { requestPackageFormSchema } from '@/features/package/schemas/package.schema'

describe('requestPackageFormSchema', () => {
  it('trims the note', () => {
    expect(requestPackageFormSchema.parse({ message: '  hi  ' })).toEqual({ message: 'hi' })
  })

  it('refuses a note over 2000 characters', () => {
    const result = requestPackageFormSchema.safeParse({ message: 'x'.repeat(2001) })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('Keep this under 2000 characters.')
  })
})
