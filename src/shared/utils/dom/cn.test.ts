import { describe, expect, it } from 'vitest'
import { cn } from '@/shared/utils/dom/cn'

describe('cn', () => {
  it('joins class names', () => {
    expect(cn('flex', 'gap-2')).toBe('flex gap-2')
  })

  it('drops falsy values and reads objects and arrays', () => {
    const off = false
    expect(cn('a', off && 'b', null, undefined, 0, { c: true, d: false }, ['e', ['f']])).toBe(
      'a c e f',
    )
  })

  it('lets a later Tailwind utility win over an earlier one', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
    expect(cn('text-sm', 'text-lg')).toBe('text-lg')
  })

  it('returns an empty string for nothing', () => {
    expect(cn()).toBe('')
  })
})
