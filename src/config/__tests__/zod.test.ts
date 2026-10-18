import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import '@/config/zod'

describe('zod config', () => {
  it('never builds a parser with new Function, which the CSP refuses', () => {
    expect(z.config().jitless).toBe(true)
  })

  it('still parses as before', () => {
    expect(z.object({ name: z.string() }).parse({ name: 'Hummus' })).toEqual({ name: 'Hummus' })
  })
})
