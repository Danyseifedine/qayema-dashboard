import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  menuTextField,
  menuTextSchema,
  requireEnglish,
  toMenuTextForm,
  translatableTextSchema,
  type MenuTextForm,
} from '@/shared/utils/string/menu-text'

describe('menuTextSchema', () => {
  it('accepts any language with text or null', () => {
    expect(menuTextSchema.parse({ en: 'Soup', fr: null })).toEqual({ en: 'Soup', fr: null })
  })

  it('rejects a value that is neither text nor null', () => {
    expect(menuTextSchema.safeParse({ en: 3 }).success).toBe(false)
  })
})

describe('translatableTextSchema', () => {
  it('needs both English and Arabic, either may be null', () => {
    expect(translatableTextSchema.parse({ en: 'Pro', ar: null })).toEqual({ en: 'Pro', ar: null })
    expect(translatableTextSchema.safeParse({ en: 'Pro' }).success).toBe(false)
  })
})

describe('menuTextField', () => {
  it('trims every language', () => {
    expect(menuTextField(10, 'name').parse({ en: '  Soup ', fr: '' })).toEqual({
      en: 'Soup',
      fr: '',
    })
  })

  it('names the field in the message when it is a plain string', () => {
    const result = menuTextField(3, 'name').safeParse({ en: 'Soup' })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('Keep the name under 3 characters.')
    expect(result.error?.issues[0]?.path).toEqual(['en'])
  })

  it('calls a function for the name only when the message is needed', () => {
    let calls = 0
    const field = menuTextField(3, () => {
      calls += 1
      return 'description'
    })

    expect(field.safeParse({ en: 'Hi' }).success).toBe(true)
    expect(calls).toBe(0)

    const result = field.safeParse({ fr: 'Bonjour' })
    expect(result.error?.issues[0]?.message).toBe('Keep the description under 3 characters.')
    expect(calls).toBe(1)
  })
})

describe('toMenuTextForm', () => {
  it('fills one entry per menu language from what was saved', () => {
    expect(toMenuTextForm({ en: 'Soup', fr: null, ar: 'شوربة' }, ['en', 'fr'])).toEqual({
      en: 'Soup',
      fr: '',
    })
  })

  it('starts every language empty when nothing was saved', () => {
    expect(toMenuTextForm(null, ['en', 'ar'])).toEqual({ en: '', ar: '' })
    expect(toMenuTextForm(undefined, ['en'])).toEqual({ en: '' })
  })
})

describe('requireEnglish', () => {
  const schema = z
    .object({ name: z.record(z.string(), z.string()) })
    .superRefine((values, ctx) => requireEnglish(values.name, 'name', 'Name it in English.', ctx))

  it('adds an issue under the English entry when it is blank', () => {
    const result = schema.safeParse({ name: { en: '   ', fr: 'Soupe' } })

    expect(result.success).toBe(false)
    expect(result.error?.issues).toEqual([
      expect.objectContaining({ path: ['name', 'en'], message: 'Name it in English.' }),
    ])
  })

  it('treats a missing English entry as blank', () => {
    const name: MenuTextForm = { fr: 'Soupe' }
    expect(schema.safeParse({ name }).success).toBe(false)
  })

  it('passes when English has text', () => {
    expect(schema.safeParse({ name: { en: 'Soup' } }).success).toBe(true)
  })
})
