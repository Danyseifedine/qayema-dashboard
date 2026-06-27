import { createContext, useContext } from 'react'

/** Shape returned by GET /api/user (Laravel UserResource). */
export type AuthUser = {
  id: number
  name: string
  email: string
  role: string
  has_completed_onboarding: boolean
  restaurant: { id: number; slug: string } | null
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

export type AuthContextValue = {
  user: AuthUser | null
  status: AuthStatus
  logout: () => Promise<void>
  redirectToLogin: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within <AuthProvider>')
  }
  return ctx
}
