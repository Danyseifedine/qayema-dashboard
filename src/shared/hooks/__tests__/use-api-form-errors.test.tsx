import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useApiFormErrors } from '@/shared/hooks/use-api-form-errors'
import { ApiError } from '@/shared/types/api'

type Values = { name: { en: string }; price: number }

function setup() {
  const setError = vi.fn()
  const hook = renderHook(() => useApiFormErrors<Values>(setError))
  return { setError, hook }
}

describe('useApiFormErrors', () => {
  it('starts with no form-level error', () => {
    const { hook } = setup()

    expect(hook.result.current.formError).toBeNull()
  })

  it('puts each 422 message under its field and leaves no banner', () => {
    const { setError, hook } = setup()
    const error = new ApiError({
      message: 'The given data was invalid.',
      status: 422,
      errors: { 'name.en': ['Name it.', 'Second message.'], price: ['Too cheap.'] },
    })

    act(() => hook.result.current.applyApiError(error))

    expect(setError).toHaveBeenCalledTimes(2)
    expect(setError).toHaveBeenCalledWith('name.en', { type: 'server', message: 'Name it.' })
    expect(setError).toHaveBeenCalledWith('price', { type: 'server', message: 'Too cheap.' })
    expect(hook.result.current.formError).toBeNull()
  })

  it('shows the summary when a 422 has a field it cannot place', () => {
    const { setError, hook } = setup()
    const error = new ApiError({
      message: 'The given data was invalid.',
      status: 422,
      errors: { price: ['Too cheap.'], logo: [] },
    })

    act(() => hook.result.current.applyApiError(error))

    expect(setError).toHaveBeenCalledTimes(1)
    expect(hook.result.current.formError).toBe('The given data was invalid.')
  })

  it('shows any other API error’s message as a banner', () => {
    const { setError, hook } = setup()

    act(() =>
      hook.result.current.applyApiError(new ApiError({ message: 'Slow down.', status: 429 })),
    )

    expect(setError).not.toHaveBeenCalled()
    expect(hook.result.current.formError).toBe('Slow down.')
  })

  it('treats a 422 without field errors as a banner', () => {
    const { setError, hook } = setup()

    act(() => hook.result.current.applyApiError(new ApiError({ message: 'Invalid.', status: 422 })))

    expect(setError).not.toHaveBeenCalled()
    expect(hook.result.current.formError).toBe('Invalid.')
  })

  it('falls back to the generic message for a non-API failure', () => {
    const { hook } = setup()

    act(() => hook.result.current.applyApiError(new Error('network down')))

    expect(hook.result.current.formError).toBe('Something went wrong. Please try again.')
  })

  it('uses the caller’s fallback when given one', () => {
    const { hook } = setup()

    act(() => hook.result.current.applyApiError('nope', 'Could not save the dish.'))

    expect(hook.result.current.formError).toBe('Could not save the dish.')
  })

  it('clears and sets the banner on request', () => {
    const { hook } = setup()

    act(() => hook.result.current.setFormError('Custom.'))
    expect(hook.result.current.formError).toBe('Custom.')

    act(() => hook.result.current.clearFormError())
    expect(hook.result.current.formError).toBeNull()
  })
})
