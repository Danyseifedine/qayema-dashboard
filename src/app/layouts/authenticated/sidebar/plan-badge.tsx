import { IconLock } from '@tabler/icons-react'
import { usePackageFor, type PackageFlag } from '@/features/package'
import { usePreferencesStore } from '@/stores/preferences.store'

/** The package that unlocks a section, as a small chip on its sidebar row. */
export function PlanBadge({ flag }: { flag: PackageFlag }) {
  const locale = usePreferencesStore((state) => state.locale)
  const name = usePackageFor(flag, locale)

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent-wash px-2 py-0.5 text-[11px] font-medium text-accent">
      <IconLock aria-hidden className="size-3" />
      {name}
    </span>
  )
}
