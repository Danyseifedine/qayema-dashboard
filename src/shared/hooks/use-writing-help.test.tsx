import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useWritingHelp } from '@/shared/hooks/use-writing-help'

describe('useWritingHelp', () => {
  it('is off, with a count that goes nowhere, outside a WritingHelpProvider', () => {
    const { result } = renderHook(() => useWritingHelp())

    expect(result.current.uses).toBeNull()
    expect(() => result.current.setLeft(3)).not.toThrow()
    expect(result.current.spentNoteBy).toBeNull()
    expect(() => result.current.queueForSpentNote('name')()).not.toThrow()
  })
})
