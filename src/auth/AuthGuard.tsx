import { useEffect, type ReactNode } from 'react'
import { useAuth } from './auth-context'

/**
 * Gate around the whole dashboard. While the session is being verified it shows
 * a neutral checking state; an unauthenticated visitor is bounced to the Laravel
 * login page and never sees the protected UI.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const { status, redirectToLogin } = useAuth()

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirectToLogin()
    }
  }, [status, redirectToLogin])

  if (status === 'loading') {
    return <div className="auth-state">Checking your session…</div>
  }

  if (status === 'unauthenticated') {
    return <div className="auth-state">Redirecting to sign in…</div>
  }

  return <>{children}</>
}
