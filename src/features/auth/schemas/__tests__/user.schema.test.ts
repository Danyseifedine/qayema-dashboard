import { describe, expect, it } from 'vitest'
import { userResponseSchema } from '@/features/auth/schemas/user.schema'
import { makeSessionUser } from '@/test/factories/session'

/** What the session says about the writing help (../qayema UserResource). */
describe('the session’s writing_help', () => {
  const parse = (writingHelp: unknown) => {
    const { writing_help: _, ...restaurant } = makeSessionUser().restaurant!
    return userResponseSchema.safeParse({
      data: {
        ...makeSessionUser(),
        restaurant:
          writingHelp === undefined ? restaurant : { ...restaurant, writing_help: writingHelp },
      },
    })
  }

  it('is off when the server says nothing about it, as an older server would', () => {
    const result = parse(undefined)

    expect(result.success).toBe(true)
    expect(result.data?.data.restaurant?.writing_help).toBeNull()
  })

  it('reads off, a daily cap, or no cap', () => {
    expect(parse(null).data?.data.restaurant?.writing_help).toBeNull()
    expect(parse({ limit: 30, left: 12 }).data?.data.restaurant?.writing_help).toEqual({
      limit: 30,
      left: 12,
    })
    expect(parse({ limit: null, left: null }).data?.data.restaurant?.writing_help).toEqual({
      limit: null,
      left: null,
    })
  })

  it('refuses a count that is not a whole number', () => {
    expect(parse({ limit: 30, left: 1.5 }).success).toBe(false)
    expect(parse({ limit: '30', left: 12 }).success).toBe(false)
    expect(parse(true).success).toBe(false)
  })
})
