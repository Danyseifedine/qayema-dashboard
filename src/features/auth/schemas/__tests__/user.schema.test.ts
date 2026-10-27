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

  const credits = {
    limit: 500,
    left: 120,
    resets_on: '2099-11-01',
    prices: { translation: 1, description: 3 },
  }

  it('reads off, a daily cap or no cap, and the month’s credits', () => {
    expect(parse(null).data?.data.restaurant?.writing_help).toBeNull()
    expect(parse({ limit: 30, left: 12, credits }).data?.data.restaurant?.writing_help).toEqual({
      limit: 30,
      left: 12,
      credits,
    })
    const uncapped = { ...credits, limit: null, left: null }
    expect(
      parse({ limit: null, left: null, credits: uncapped }).data?.data.restaurant?.writing_help,
    ).toEqual({ limit: null, left: null, credits: uncapped })
  })

  it('reads no credits from a server from before them', () => {
    expect(parse({ limit: 30, left: 12 }).data?.data.restaurant?.writing_help).toEqual({
      limit: 30,
      left: 12,
      credits: null,
    })
  })

  it('refuses a count that is not a whole number', () => {
    expect(parse({ limit: 30, left: 1.5, credits }).success).toBe(false)
    expect(parse({ limit: '30', left: 12, credits }).success).toBe(false)
    expect(parse({ limit: 30, left: 12, credits: { ...credits, left: 0.5 } }).success).toBe(false)
    expect(parse(true).success).toBe(false)
  })
})

/** Home's checklist: the dishes still without a photo, counted by the server. */
describe('the session’s dishes_without_photo', () => {
  const parse = (count: unknown) => {
    const { dishes_without_photo: _, ...restaurant } = makeSessionUser().restaurant!
    return userResponseSchema.safeParse({
      data: {
        ...makeSessionUser(),
        restaurant:
          count === undefined ? restaurant : { ...restaurant, dishes_without_photo: count },
      },
    })
  }

  it('reads the count, and none from an older server', () => {
    expect(parse(3).data?.data.restaurant?.dishes_without_photo).toBe(3)
    expect(parse(undefined).data?.data.restaurant?.dishes_without_photo).toBe(0)
  })

  it('refuses a count that is not a whole number', () => {
    expect(parse(1.5).success).toBe(false)
    expect(parse('3').success).toBe(false)
  })
})

/** The features an admin turned off for the restaurant (../qayema UserResource). */
describe('the session’s turned_off', () => {
  const parse = (turnedOff: unknown) => {
    const { turned_off: _, ...restaurant } = makeSessionUser().restaurant!
    return userResponseSchema.safeParse({
      data: {
        ...makeSessionUser(),
        restaurant: turnedOff === undefined ? restaurant : { ...restaurant, turned_off: turnedOff },
      },
    })
  }

  it('reads the flags turned off', () => {
    expect(parse(['ordering', 'qr_studio']).data?.data.restaurant?.turned_off).toEqual([
      'ordering',
      'qr_studio',
    ])
  })

  it('is none when the server says nothing about it, as an older server would', () => {
    const result = parse(undefined)

    expect(result.success).toBe(true)
    expect(result.data?.data.restaurant?.turned_off).toEqual([])
  })
})
