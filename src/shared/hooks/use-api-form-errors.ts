import { useCallback, useState } from 'react'
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { ApiError } from '@/shared/types/api'

/**
 * Bridges a rejected API call into a form.
 *
 * Laravel answers a bad submit with 422 and `{errors: {field: [msg, ...]}}`.
 * Those messages belong under their fields; anything else (401, 429, a
 * network failure) belongs in a form-level banner. This hook does that split
 * so no form has to reach into an error object itself.
 */
export function useApiFormErrors<T extends FieldValues>(setError: UseFormSetError<T>) {
  const [formError, setFormError] = useState<string | null>(null)

  const clear = useCallback(() => setFormError(null), [])

  const apply = useCallback(
    (error: unknown, fallbackMessage = 'Something went wrong. Please try again.') => {
      if (error instanceof ApiError && error.isValidation && error.errors) {
        const entries = Object.entries(error.errors)
        let matched = 0

        for (const [field, messages] of entries) {
          const message = messages[0]
          if (!message) continue
          // Laravel names nested fields `name.en`; RHF uses the same path form.
          setError(field as Path<T>, { type: 'server', message })
          matched += 1
        }

        // A 422 whose fields we could not place still has to be visible.
        setFormError(matched === entries.length ? null : error.message)
        return
      }

      setFormError(error instanceof ApiError ? error.message : fallbackMessage)
    },
    [setError],
  )

  return { formError, setFormError, applyApiError: apply, clearFormError: clear }
}
