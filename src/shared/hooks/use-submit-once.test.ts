import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useSubmitOnce } from '@/shared/hooks/use-submit-once'

describe('useSubmitOnce', () => {
  it('ignores a second submission while the first is running', () => {
    const { result } = renderHook(() => useSubmitOnce())
    const run = vi.fn()

    result.current(run)
    result.current(run)

    expect(run).toHaveBeenCalledTimes(1)
  })

  it('lets the next one through once the first is done', () => {
    const { result } = renderHook(() => useSubmitOnce())
    let finish = () => {}
    const run = vi.fn((done: () => void) => {
      finish = done
    })

    result.current(run)
    finish()
    result.current(run)

    expect(run).toHaveBeenCalledTimes(2)
  })

  it('keeps the same function across renders', () => {
    const { result, rerender } = renderHook(() => useSubmitOnce())
    const first = result.current

    rerender()

    expect(result.current).toBe(first)
  })
})
