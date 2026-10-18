import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { sessionKeys } from '@/features/auth/hooks/session-keys'
import { useWritingHelpLeft } from '@/features/auth/hooks/use-writing-help-left'
import type { AuthUser } from '@/features/auth/schemas/user.schema'
import { makeSessionUser } from '@/test/factories/session'

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
  it('writes what is left into the session', () => {
    const { setLeft, now } = render(makeSessionUser({ writing_help: { limit: 30, left: 30 } }))

    act(() => setLeft(29))

    expect(now()?.restaurant?.writing_help).toEqual({ limit: 30, left: 29 })
  })

  it('leaves writing help that is off, or no session, as it is', () => {
    const off = render(makeSessionUser({ writing_help: null }))
    act(() => off.setLeft(3))
    expect(off.now()?.restaurant?.writing_help).toBeNull()

    const none = render(undefined)
    act(() => none.setLeft(3))
    expect(none.now()).toBeUndefined()
  })
})
