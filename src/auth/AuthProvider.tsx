import { useCallback, useEffect, useState, type ReactNode } from 'react'
import api, { ensureCsrfToken } from '../lib/api'
import { AuthContext, type AuthStatus, type AuthUser } from './auth-context'

const LOGIN_URL = import.meta.env.VITE_LOGIN_URL

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  const redirectToLogin = useCallback(() => {
    window.location.href = LOGIN_URL
  }, [])

  useEffect(() => {
    let active = true

    const bootstrap = async () => {
      try {
        const { data } = await api.get('/api/user')
        if (!active) {
          return
        }
        // UserResource wraps the payload in a `data` key.
        setUser((data?.data ?? data) as AuthUser)
        setStatus('authenticated')
      } catch {
        if (active) {
          setUser(null)
          setStatus('unauthenticated')
        }
      }
    }

    void bootstrap()

    return () => {
      active = false
    }
  }, [])

  const logout = useCallback(async () => {
    // Redirect ONLY after the server confirms the session is destroyed. A
    // redirect-no-matter-what (the old behaviour) left the user logged in on the
    // API domain whenever the logout POST failed (e.g. cross-domain CSRF).
    await ensureCsrfToken()
    await api.post('/api/logout')
    setUser(null)
    setStatus('unauthenticated')
    redirectToLogin()
  }, [redirectToLogin])

  return (
    <AuthContext.Provider value={{ user, status, logout, redirectToLogin }}>
      {children}
    </AuthContext.Provider>
  )
}
