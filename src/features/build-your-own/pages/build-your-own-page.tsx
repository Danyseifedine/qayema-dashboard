import { IconPizza, IconPlus } from '@tabler/icons-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMenuLanguages, useSession } from '@/features/auth'
import { useCategories, useDeleteDish, useDishes, type Dish } from '@/features/menu'
import { LimitHeader } from '@/shared/components/data-display'
import { ConfirmDialog, EmptyState, ErrorState, SkeletonList } from '@/shared/components/feedback'
import { Alert, Button } from '@/shared/components/ui'
import { isAtLimit } from '@/shared/utils/limits/is-at-limit'
import type { Locale } from '@/shared/constants/locales'
import { nameOr } from '@/shared/utils/string/translated'
import { useUiStore } from '@/stores/ui.store'
import { BuildEditor } from '@/features/build-your-own/components/editor/build-editor'
import { BuildCard } from '@/features/build-your-own/components/list/build-card'
import { useRemoveBuild } from '@/features/build-your-own/hooks/use-build-your-own'
import { savedBuildsPayload, type Build } from '@/features/build-your-own/schemas/build.schema'

export type BuildYourOwnPageProps = {
  /** Menu text's language, for the dishes' and builds' names. */
  locale: Locale
}

/** A build with the dish it is on. */
type Placed = { build: Build; dish: Dish }

/**
 * Dishes guests build from parts (a pizza half and half, three scoops): a
 * card per build, in the owner's order of dishes, with "New build". Making
 * or changing one swaps the list for the editor's steps, and back. A
 * build is its dish: a new one makes a dish (so it counts against the
 * package's dishes), and deleting a dish's only build deletes the dish;
 * one of several is saved away from the others. Opened from a
 * dish's window, the page scrolls to that dish's builds.
 */
export function BuildYourOwnPage({ locale }: BuildYourOwnPageProps) {
  const { t } = useTranslation('build-your-own')
  const dishes = useDishes()
  const categories = useCategories()
  const languages = useMenuLanguages()
  const session = useSession()
  const removeBuild = useRemoveBuild()
  const removeDish = useDeleteDish()

  // The build open in the editor: null for a new one, undefined for the list.
  const [editing, setEditing] = useState<Placed | null | undefined>(undefined)
  const [pendingDelete, setPendingDelete] = useState<Placed | null>(null)

  const dishList = useMemo(() => dishes.data?.data ?? [], [dishes.data])
  const categoryList = useMemo(() => categories.data?.data ?? [], [categories.data])
  const placed = useMemo(
    () => dishList.flatMap((dish) => dish.builds.map((build) => ({ build, dish }))),
    [dishList],
  )
  const currency = dishes.data?.meta.currency ?? 'USD'

  // A dish's window sent the owner here: its builds are brought into view once.
  const shownDish = useUiStore((state) => state.buildsDishId)
  const showBuildsOf = useUiStore((state) => state.showBuildsOf)
  const loaded = dishes.data !== undefined
  useEffect(() => {
    if (shownDish === null || !loaded) return
    document.querySelector(`[data-dish="${shownDish}"]`)?.scrollIntoView?.({ block: 'center' })
    showBuildsOf(null)
  }, [shownDish, loaded, showBuildsOf])

  if (editing !== undefined) {
    return (
      <BuildEditor
        key={editing?.build.id ?? 'new'}
        build={editing?.build ?? null}
        dish={editing?.dish ?? null}
        dishes={dishList}
        categories={categoryList}
        currency={currency}
        locale={locale}
        onClose={() => setEditing(undefined)}
      />
    )
  }

  const loading = dishes.isPending || categories.isPending
  const failed = dishes.isError ? dishes : categories.isError ? categories : null

  // A new build makes a dish guests build: it waits for room among those
  // (counted from the list in hand, the limit from the session), for room
  // among the package's dishes, and for a category.
  const builtCount = dishList.filter((dish) => dish.builds.length > 0).length
  const buildLimit = session.data?.restaurant?.limits.builds.limit ?? null
  const atBuildLimit = isAtLimit({ used: builtCount, limit: buildLimit })
  const atDishLimit = isAtLimit(dishes.data?.meta)
  const atLimit = atBuildLimit || atDishLimit
  const noCategories = !loading && failed === null && categoryList.length === 0

  // A dish's only build goes with its dish; one of several leaves the others.
  const only = pendingDelete?.dish.builds.length === 1
  const pendingDish = pendingDelete
    ? nameOr(pendingDelete.dish.name, locale, t('card.untitled'))
    : ''
  const remove = (target: Placed) => {
    const done = { onSuccess: () => setPendingDelete(null) }
    if (target.dish.builds.length === 1) {
      removeDish.mutate(target.dish.id, done)
      return
    }
    removeBuild.mutate(
      {
        dishId: target.dish.id,
        builds: savedBuildsPayload(target.dish, dishList, languages).filter(
          (build) => build.id !== target.build.id,
        ),
      },
      done,
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <LimitHeader
        used={builtCount}
        limit={buildLimit}
        loading={dishes.isPending || session.isPending}
        action={
          <Button
            leadingIcon={<IconPlus aria-hidden className="size-[18px]" />}
            disabled={loading || failed !== null || atLimit || noCategories}
            onClick={() => setEditing(null)}
          >
            {t('page.add')}
          </Button>
        }
      />

      {atBuildLimit ? (
        <Alert variant="warning">{t('page.atBuildLimit', { count: buildLimit ?? 0 })}</Alert>
      ) : atDishLimit ? (
        <Alert variant="warning">{t('page.atLimit')}</Alert>
      ) : null}
      {noCategories ? <Alert variant="warning">{t('page.noCategories')}</Alert> : null}

      {loading ? (
        <SkeletonList
          count={2}
          className="grid grid-cols-1 gap-3 xl:grid-cols-2"
          itemClassName="h-[108px]"
        />
      ) : failed ? (
        <ErrorState description={failed.error.message} onRetry={() => void failed.refetch()} />
      ) : placed.length === 0 ? (
        <EmptyState
          icon={IconPizza}
          title={t('page.emptyTitle')}
          description={
            <>
              {t('page.emptyDescription')}
              <span className="mt-2 block">{t('page.emptyPizza')}</span>
              <span className="block">{t('page.emptyScoops')}</span>
            </>
          }
          action={
            <Button disabled={atLimit || noCategories} onClick={() => setEditing(null)}>
              {t('page.addFirst')}
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {placed.map((each) => (
            <BuildCard
              key={each.build.id}
              build={each.build}
              dish={each.dish}
              dishes={dishList}
              categories={categoryList}
              locale={locale}
              onEdit={() => setEditing(each)}
              onDelete={() => setPendingDelete(each)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        loading={removeBuild.isPending || removeDish.isPending}
        title={only ? t('page.removeDishTitle', { dish: pendingDish }) : t('page.removeTitle')}
        description={
          only
            ? t('page.removeDishDescription')
            : t('page.removeDescription', { dish: pendingDish })
        }
        confirmLabel={only ? t('page.removeDishConfirm') : t('page.removeConfirm')}
        // Open only while a build waits to be deleted.
        onConfirm={() => remove(pendingDelete!)}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
