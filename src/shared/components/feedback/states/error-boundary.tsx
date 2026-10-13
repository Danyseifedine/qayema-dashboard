import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { reportError } from '@/lib/api/report-error'
import { ErrorState } from '@/shared/components/feedback/states/error-state'

type ErrorBoundaryProps = { children: ReactNode }

type ErrorBoundaryState = { failed: boolean }

/** What shows in place of a page that broke: what happened, and a reload. */
function BrokenPage() {
  const { t } = useTranslation()

  return (
    <ErrorState description={t('errorBoundary.body')} onRetry={() => window.location.reload()} />
  )
}

/**
 * A page that throws while drawing shows `BrokenPage` instead of leaving the
 * screen blank, and the error is reported (`reportError`). App wraps each
 * page in one, keyed by the page, so moving to another page starts afresh;
 * main.tsx wraps the whole app in another.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    reportError(error, 'render', info.componentStack)
  }

  render() {
    return this.state.failed ? <BrokenPage /> : this.props.children
  }
}
