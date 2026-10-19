import { useTranslation } from 'react-i18next'
import { useSession } from '@/features/auth'
import { ErrorState, SkeletonList } from '@/shared/components/feedback'
import { PasswordSection } from '@/features/account/components/password/password-section'
import { ProfileSection } from '@/features/account/components/profile/profile-section'

/**
 * The owner's own account, as opposed to their restaurant.
 *
 * Two independent forms rather than one: saving a name and changing a password
 * are different acts with different risks, and a single Save over both would
 * make an accidental password change far too easy.
 */
export function AccountPage() {
  const { t } = useTranslation('account')
  const session = useSession()
  const user = session.data

  return (
    <div className="flex flex-1 flex-col gap-5">
      {session.isPending ? (
        <SkeletonList
          count={2}
          className="grid items-start gap-4 xl:grid-cols-2"
          itemClassName="h-56"
        />
      ) : session.isError || user === undefined ? (
        <ErrorState
          description={session.error?.message ?? t('page.loadFailed')}
          onRetry={() => void session.refetch()}
        />
      ) : (
        <div className="grid items-start gap-4 xl:grid-cols-2">
          <ProfileSection name={user.name} email={user.email} username={user.username} />
          <PasswordSection hasPassword={user.has_password} />
        </div>
      )}
    </div>
  )
}
