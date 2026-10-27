import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { sessionKeys } from '@/features/auth/hooks/session-keys'
import { useWritingHelpLeft } from '@/features/auth/hooks/use-writing-help-left'
import type { AuthUser } from '@/features/auth/schemas/user.schema'
import { makeSessionUser, makeWritingHelp } from '@/test/factories/session'

function render(session: AuthUser | undefined) {
  const queryClient = new QueryClient()
  if (session) queryClient.setQueryData(sessionKeys.current(), session)
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(() => useWritingHelpLeft(), { wrapper })
  const now = () => queryClient.getQueryData<AuthUser>(sessionKeys.current())
  return { setLeft: result.current, now }
}

describe('useWritingHelpLeft', () => {
  it('writes what is left into the session, keeping a count the answer does not give', () => {
    const { setLeft, now } = render(
      makeSessionUser({ writing_help: makeWritingHelp({}, { limit: 500, left: 500 }) }),
    )

    act(() => setLeft({ uses: 29, credits: 499 }))
    expect(now()?.restaurant?.writing_help).toEqual(
      makeWritingHelp({ left: 29 }, { limit: 500, left: 499 }),
    )

    // A refusal of the month's credits says only those.
    act(() => setLeft({ credits: 2 }))
    expect(now()?.restaurant?.writing_help).toEqual(
      makeWritingHelp({ left: 29 }, { limit: 500, left: 2 }),
    )
  })

  it('leaves writing help that is off, or no session, as it is', () => {
    const off = render(makeSessionUser({ writing_help: null }))
    act(() => off.setLeft({ uses: 3 }))
    expect(off.now()?.restaurant?.writing_help).toBeNull()

    const none = render(undefined)
    act(() => none.setLeft({ uses: 3 }))
    expect(none.now()).toBeUndefined()
  })
})
