import { describe, expect, it } from 'vitest'
import { patchRestaurant } from '@/features/restaurant/hooks/use-session-save'
import { makeSessionUser } from '@/test/factories/session'

describe('patchRestaurant', () => {
  it('changes the restaurant and keeps the rest of the session', () => {
    const user = makeSessionUser()

    const patched = patchRestaurant(user, (restaurant) => ({
      switched_off: [...restaurant.switched_off, 'qr'],
    }))

    expect(patched?.restaurant?.switched_off).toContain('qr')
    expect(patched?.restaurant?.id).toBe(user.restaurant?.id)
    expect(patched?.name).toBe(user.name)
  })

  it('leaves a session without a restaurant, or none at all, as it is', () => {
    const user = { ...makeSessionUser(), restaurant: null }

    expect(patchRestaurant(user, () => ({ switched_off: ['qr'] }))).toBe(user)
    expect(patchRestaurant(undefined, () => ({ switched_off: ['qr'] }))).toBeUndefined()
  })
})
