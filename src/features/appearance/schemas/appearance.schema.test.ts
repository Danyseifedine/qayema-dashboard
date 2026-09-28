import { describe, expect, it } from 'vitest'
import {
  designSettingsFormSchema,
  settingValueSchema,
  type DesignSetting,
} from '@/features/appearance/schemas/appearance.schema'

function setting(overrides: Partial<DesignSetting>): DesignSetting {
  return {
    key: 'k',
    type: 'text',
    label: { en: 'K', ar: null },
    default: null,
    value: null,
    contrast_with: null,
    options: [],
    ...overrides,
  }
}

describe('settingValueSchema', () => {
  it('takes a six-digit hex colour and refuses anything else', () => {
    const schema = settingValueSchema(setting({ type: 'color' }))
    expect(schema.safeParse('#A1b2C3').success).toBe(true)

    const result = schema.safeParse('red')
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('Use a colour like #F8D38D.')
  })

  it('takes a boolean for a switch', () => {
    const schema = settingValueSchema(setting({ type: 'boolean' }))
    expect(schema.safeParse(false).success).toBe(true)
    expect(schema.safeParse('false').success).toBe(false)
  })

  it('takes only one of the declared options for a choice', () => {
    const schema = settingValueSchema(setting({ type: 'select', options: ['cosy', 'compact'] }))
    expect(schema.safeParse('compact').success).toBe(true)
    expect(schema.safeParse('roomy').success).toBe(false)
  })

  it('caps a line of text at 255 characters', () => {
    const schema = settingValueSchema(setting({ type: 'text' }))
    expect(schema.safeParse('x'.repeat(255)).success).toBe(true)

    const result = schema.safeParse('x'.repeat(256))
    expect(result.error?.issues[0]?.message).toBe('Keep it under 255 characters.')
  })
})

describe('designSettingsFormSchema', () => {
  it('checks each setting by its own type, keyed like the API', () => {
    const schema = designSettingsFormSchema([
      setting({ key: 'main', type: 'color' }),
      setting({ key: 'show', type: 'boolean' }),
    ])

    expect(schema.safeParse({ settings: { main: '#000000', show: true } }).success).toBe(true)
    expect(schema.safeParse({ settings: { main: 'nope', show: true } }).success).toBe(false)
  })
})
