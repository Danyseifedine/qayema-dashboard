import { Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { env } from '@/config/env'
import { safeRedirect } from '@/lib/security/safe-redirect'
import { Alert, Button } from '@/shared/components/ui'
import { useSession } from '@/features/auth/hooks/use-session'
import type { AuthUser } from '@/features/auth/schemas/user.schema'

/** Where the Laravel wizard lives, derived from the API origin. */
const ONBOARDING_URL = `${env.VITE_API_URL}/onboarding`

export type SessionGateProps = {
  children: (user: AuthUser) => ReactNode
}

/**
 * Decides what a visitor sees before the dashboard renders.
 *
 * Four outcomes, in order:
 *  - still checking       a neutral waiting state
 *  - no session (401)     the interceptor is already leaving for the login page
 *  - onboarding unfinished  back to the Laravel wizard to finish it
 *  - signed in and done   the dashboard
 *
 * The backend sends an onboarded owner here after Google login, and an
 * unfinished one to the wizard. This gate covers the other direction: someone
 * who reaches the dashboard URL directly without having finished.
 */
export function SessionGate({ children }: SessionGateProps) {
  const { t } = useTranslation()
  const session = useSession()

  if (session.isPending) {
    return (
      <div className="grid min-h-dvh place-items-center bg-[var(--bg)] text-[var(--muted)]">
        <p className="flex items-center gap-2.5 text-[14px]">
          <Loader2 aria-hidden className="size-4 animate-spin" />
          {t('session.checking')}
        </p>
      </div>
    )
  }

  if (session.isError) {
    // A 401 is already redirecting to the login page; anything else is a real
    // failure the owner can retry.
    const unauthenticated = session.error.isUnauthenticated

    return (
      <div className="grid min-h-dvh place-items-center bg-[var(--bg)] px-4">
        <div className="w-full max-w-md">
          <Alert
            variant={unauthenticated ? 'info' : 'error'}
            title={unauthenticated ? t('session.redirectingTitle') : t('session.loadFailed')}
          >
            {unauthenticated ? t('session.redirectingBody') : session.error.message}
          </Alert>
          {unauthenticated ? null : (
            <Button className="mt-4" block onClick={() => void session.refetch()}>
              {t('session.retry')}
            </Button>
          )}
        </div>
      </div>
    )
  }

  const user = session.data
  const needsOnboarding = !user.has_completed_onboarding || user.restaurant === null

  if (needsOnboarding) {
    return (
      <div className="grid min-h-dvh place-items-center bg-[var(--bg)] px-4">
        <div className="w-full max-w-md">
          <Alert variant="info" title={t('session.onboardingTitle')}>
            {t('session.onboardingBody')}
          </Alert>
          <Button className="mt-4" block onClick={() => safeRedirect(ONBOARDING_URL)}>
            {t('session.continueSetup')}
          </Button>
        </div>
      </div>
    )
  }

  return <>{children(user)}</>
}
