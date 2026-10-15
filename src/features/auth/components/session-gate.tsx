import { IconLoader2 } from '@tabler/icons-react'
import { useEffect, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { env } from '@/config/env'
import { useUnanswered } from '@/lib/api/unanswered'
import { safeRedirect } from '@/lib/security/safe-redirect'
import { Alert, Button } from '@/shared/components/ui'
import { useSession } from '@/features/auth/hooks/use-session'
import type { AuthUser } from '@/features/auth/schemas/user.schema'

/** Where the Laravel wizard lives, derived from the API origin. */
const ONBOARDING_URL = `${env.VITE_API_URL}/onboarding`

const signIn = () => safeRedirect(env.VITE_LOGIN_URL)

/**
 * A page the browser brings back from its back-forward cache is as it was
 * when it left: after a logout, stuck on "Taking you to sign in" with the
 * redirect already spent. Reloaded, it asks for the session afresh.
 */
function reloadWhenRestored(event: PageTransitionEvent) {
  if (event.persisted) window.location.reload()
}

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
  const unauthenticated = session.isError && session.error.isUnauthenticated
  // The phone reaches the site but its requests are refused: the host's bot
  // protection, not the owner's internet. Said as it is, with the way past it.
  const blocked = useUnanswered() === 'blocked'

  useEffect(() => {
    window.addEventListener('pageshow', reloadWhenRestored)
    return () => window.removeEventListener('pageshow', reloadWhenRestored)
  }, [])

  // Leaves from here too, not only from the 401 interceptor, which fires
  // once per page: this screen never waits on a redirect already spent.
  useEffect(() => {
    if (unauthenticated) signIn()
  }, [unauthenticated])

  if (session.isPending) {
    return (
      <div className="grid min-h-dvh place-items-center bg-[var(--bg)] text-[var(--muted)]">
        <p className="flex items-center gap-2.5 text-[14px]" role="status">
          <IconLoader2 aria-hidden className="size-4 animate-spin" />
          {/* A try has failed and another is on its way: say so, rather than wait in silence. */}
          {session.failureCount === 0
            ? t('session.checking')
            : blocked
              ? t('session.blockedTrying')
              : t('session.slow')}
        </p>
      </div>
    )
  }

  if (
    session.isError &&
    (session.error.code === 'blocked' || (blocked && session.error.status === 0))
  ) {
    // Opening the site in a page of its own lets the host's check run (it
    // cannot in a background request); back here, Try again gets through.
    return (
      <div className="grid min-h-dvh place-items-center bg-[var(--bg)] px-4">
        <div className="w-full max-w-md">
          <Alert variant="error" title={t('session.blockedTitle')}>
            {t('session.blockedBody')}
          </Alert>
          <Button
            className="mt-4"
            block
            onClick={() => window.open(env.VITE_API_URL, '_blank', 'noopener,noreferrer')}
          >
            {t('session.openSite')}
          </Button>
          <Button className="mt-2" variant="secondary" block onClick={() => void session.refetch()}>
            {t('session.retry')}
          </Button>
        </div>
      </div>
    )
  }

  if (session.isError) {
    // A 401 is on its way to the login page, with a button should the
    // redirect not happen; anything else is a real failure to retry.
    return (
      <div className="grid min-h-dvh place-items-center bg-[var(--bg)] px-4">
        <div className="w-full max-w-md">
          <Alert
            variant={unauthenticated ? 'info' : 'error'}
            title={unauthenticated ? t('session.redirectingTitle') : t('session.loadFailed')}
          >
            {unauthenticated ? t('session.redirectingBody') : session.error.message}
          </Alert>
          {unauthenticated ? (
            <Button className="mt-4" block onClick={signIn}>
              {t('session.signIn')}
            </Button>
          ) : (
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
