import { describe, expect, it } from 'vitest'
import {
  FALLBACK_LANGUAGE,
  LANGUAGES,
  NAMESPACES,
  languageMeta,
  messagesFor,
} from '@/lib/i18n/index'

/**
 * Every language must say everything English says — no more, no less — or an
 * owner sees an English sentence in the middle of an Arabic screen. Plurals
 * are checked against the forms that language actually has: Arabic needs
 * zero, one, two, few, many and other; English only one and other.
 */

const PLURAL = /_(zero|one|two|few|many|other)$/

function flatten(messages: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(messages).flatMap(([key, value]) =>
    value !== null && typeof value === 'object'
      ? flatten(value as Record<string, unknown>, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  )
}

const baseKeys = (keys: string[]) => [...new Set(keys.map((key) => key.replace(PLURAL, '')))].sort()

describe.each(LANGUAGES)('the %s translation', (language) => {
  it('has a name, a short label and a direction', () => {
    const meta = languageMeta(language)
    expect(meta.name).not.toBe('')
    expect(meta.short).not.toBe('')
    expect(['ltr', 'rtl']).toContain(meta.dir)
  })

  it.each(NAMESPACES)('has every line of %s.json', (namespace) => {
    const english = baseKeys(flatten(messagesFor(FALLBACK_LANGUAGE)[namespace] ?? {}))
    const theirs = baseKeys(flatten(messagesFor(language)[namespace] ?? {}))

    expect(theirs).toEqual(english)
  })

  it.each(NAMESPACES)('has every plural form %s.json needs', (namespace) => {
    const keys = flatten(messagesFor(language)[namespace] ?? {})
    const plurals = [
      ...new Set(keys.filter((key) => PLURAL.test(key)).map((key) => key.replace(PLURAL, ''))),
    ]
    const forms = new Intl.PluralRules(language).resolvedOptions().pluralCategories

    for (const base of plurals) {
      for (const form of forms) {
        expect(keys, `${namespace}: ${base}_${form}`).toContain(`${base}_${form}`)
      }
    }
  })

  it.each(NAMESPACES)('has no empty lines in %s.json', (namespace) => {
    const values = flatten(messagesFor(language)[namespace] ?? {}).map((key) =>
      key
        .split('.')
        .reduce<unknown>(
          (node, part) => (node as Record<string, unknown>)[part],
          messagesFor(language)[namespace],
        ),
    )
    expect(values.filter((value) => typeof value !== 'string' || value.trim() === '')).toEqual([])
  })
})
