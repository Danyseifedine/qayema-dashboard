import { describe, expect, it } from 'vitest'
import { controlClass } from '@/shared/components/ui/control-class'

describe('controlClass', () => {
  it('leaves the border, background and focus ring to the shell', () => {
    const classes = controlClass.split(' ')

    expect(classes).toEqual(
      expect.arrayContaining(['border-0', 'bg-transparent', 'outline-none', 'focus:ring-0']),
    )
  })

  it('fills the shell and shows a disabled cursor', () => {
    expect(controlClass).toContain('w-full')
    expect(controlClass).toContain('disabled:cursor-not-allowed')
  })
})
