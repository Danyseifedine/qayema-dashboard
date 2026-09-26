import { Store } from 'lucide-react'
import { useSession } from '@/features/auth/hooks/use-session'
import { ErrorState } from '@/shared/components/feedback'
import { Button } from '@/shared/components/ui'
import { PasswordSection } from '../components/password/password-section'
import { ProfileSection } from '../components/profile/profile-section'

/**
 * The owner's own account, as opposed to their restaurant.
 *
 * Two independent forms rather than one: saving a name and changing a password
 * are different acts with different risks, and a single Save over both would
 * make an accidental password change far too easy.
 */
export type AccountPageProps = {
  /** Sends an owner looking for the restaurant's name to the right page. */
  onOpenRestaurant: () => void
}

export function AccountPage({ onOpenRestaurant }: AccountPageProps) {
  const session = useSession()
  const user = session.data

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-[19px] leading-tight">Profile</h2>
          <p className="mt-1 text-[13px] leading-snug text-[var(--muted)]">
            You, the person: your name and how you sign in. Nothing here reaches your menu.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          leadingIcon={<Store className="size-4" />}
          onClick={onOpenRestaurant}
        >
          Edit your restaurant instead
        </Button>
      </div>

      {session.isPending ? (
        <div className="grid items-start gap-4 xl:grid-cols-2">
          {Array.from({ length: 2 }, (_, index) => (
            <div key={index} className="h-56 animate-pulse rounded-[14px] bg-[var(--hover-wash)]" />
          ))}
        </div>
      ) : session.isError || user === undefined ? (
        <ErrorState
          description={session.error?.message ?? 'We could not load your account.'}
          onRetry={() => void session.refetch()}
        />
      ) : (
        <div className="grid items-start gap-4 xl:grid-cols-2">
          <ProfileSection name={user.name} email={user.email} />
          <PasswordSection hasPassword={user.has_password} />
        </div>
      )}
    </div>
  )
}
