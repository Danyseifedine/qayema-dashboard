import { describe, expect, it } from 'vitest'
import {
  packageListSchema,
  requestPackageFormSchema,
} from '@/features/package/schemas/package.schema'
import { PACKAGE_CATALOGUE } from '@/test/factories/packages'

describe('packageListSchema', () => {
  it("reads the restaurant's own price for its package", () => {
    const list = packageListSchema.parse({
      data: PACKAGE_CATALOGUE,
      meta: { current: 'pro', your_price_cents: 450 },
    })
    expect(list.meta.your_price_cents).toBe(450)
  })

  it('takes the published price when there is no price of its own, or no field at all', () => {
    expect(
      packageListSchema.parse({ data: [], meta: { current: 'free', your_price_cents: null } }).meta
        .your_price_cents,
    ).toBeNull()
    expect(
      packageListSchema.parse({ data: [], meta: { current: 'free' } }).meta.your_price_cents,
    ).toBeNull()
  })
})

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
