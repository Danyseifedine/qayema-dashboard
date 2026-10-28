import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { floatingRoot, useAnchoredPlace } from '@/shared/hooks/use-anchored-place'

const options = { width: 296, height: 372, alignEnd: true, matchWidth: false }

describe('useAnchoredPlace', () => {
  it('places nothing while closed', () => {
    const anchor = { current: document.createElement('div') }
    const { result } = renderHook(() => useAnchoredPlace(false, anchor, options))
    expect(result.current).toEqual({})
  })

  it('places nothing without a field to sit at', () => {
    const anchor = { current: null }
    const { result } = renderHook(() => useAnchoredPlace(true, anchor, options))
    expect(result.current).toEqual({})
  })

  it('opens under the field, from its start edge, as wide as it asks', () => {
    const anchor = { current: document.createElement('div') }
    document.body.append(anchor.current)
    // jsdom measures every box at zero, at the window's top left.
    const { result } = renderHook(() => useAnchoredPlace(true, anchor, options))
    expect(result.current).toEqual({ top: 6, left: 0 })
    anchor.current.remove()
  })
})

describe('floatingRoot', () => {
  it('draws in the dialog the field sits in, else on the page', () => {
    const dialog = document.createElement('dialog')
    const field = document.createElement('div')
    dialog.append(field)
    document.body.append(dialog)

    expect(floatingRoot(field)).toBe(dialog)
    expect(floatingRoot(document.createElement('div'))).toBe(document.body)
    expect(floatingRoot(null)).toBe(document.body)
    dialog.remove()
  })
})
