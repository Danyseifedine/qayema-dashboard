import { IconArrowBackUp, IconEye } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import type { AuthUser } from '@/features/auth'
import { Button } from '@/shared/components/ui'

export type ImpersonationBannerProps = {
  /** The owner whose dashboard this is. */
  owner: string
  impersonation: NonNullable<AuthUser['impersonation']>
}

/**
 * An admin is looking at this dashboard as its owner (/admin → Users →
 * Impersonate). At the top of every page, so nothing is changed by mistake,
 * with the way back: the server's leave link hands the session back to the
 * admin and opens their Users list.
 */
export function ImpersonationBanner({ owner, impersonation }: ImpersonationBannerProps) {
  const { t } = useTranslation()

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b-[0.5px] border-status-warn-border bg-status-warn-wash px-4 py-2 text-[13px] text-status-warn sm:px-6"
    >
      <p className="flex min-w-0 items-center gap-2">
        <IconEye aria-hidden className="size-4 shrink-0" />
        <span className="min-w-0">
          {impersonation.admin
            ? t('impersonation.viewingAs', { owner, admin: impersonation.admin })
            : t('impersonation.viewing', { owner })}
        </span>
      </p>
      <Button
        size="sm"
        variant="secondary"
        leadingIcon={<IconArrowBackUp aria-hidden className="size-4" />}
        onClick={() => window.location.assign(impersonation.leave_url)}
      >
        {t('impersonation.back')}
      </Button>
    </div>
  )
}
