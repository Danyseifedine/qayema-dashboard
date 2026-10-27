import { IconPlus, IconToolsKitchen2 } from '@tabler/icons-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LimitHeader } from '@/shared/components/data-display'
import { isAtLimit } from '@/shared/utils/limits/is-at-limit'
import { useCategories } from '@/features/menu/categories/hooks/use-categories'
import { CategoryFilter, UNCATEGORISED } from '@/features/menu/components/filters/category-filter'
import { SortableCard, SortableList } from '@/features/menu/components/dnd'
import { MenuSwitch } from '@/features/menu/components/nav/menu-switch'
import { DishDialog } from '@/features/menu/dishes/components/dialogs/dish-dialog'
import { DishCard } from '@/features/menu/dishes/components/list/dish-card'
import {
  useDeleteDish,
  useDishAvailability,
  useDishes,
  useReorderDishes,
} from '@/features/menu/dishes/hooks/use-dishes'
import type { Dish } from '@/features/menu/dishes/schemas/dish.schema'
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  PictureEmptyState,
  SkeletonList,
} from '@/shared/components/feedback'
import { Alert, Button } from '@/shared/components/ui'
import { useDishBuilds, useDishChoices } from '@/features/auth'
import type { Locale } from '@/shared/constants/locales'
import { nameOr } from '@/shared/utils/string/translated'

export type DishesPageProps = {
  locale: Locale
  /** A dish needs a category, so the empty state can send the owner there. */
  onOpenCategories: () => void
  /** A dish guests build is changed on the Build your own page. */
  onOpenBuilds: () => void
  /** A deal dish's offer is changed on the Offers page. */
  onOpenOffers: () => void
}

/**
 * Dishes, on their own page.
 *
 * A card grid filtered by the category chips. Cards rather than a table,
 * because this is edited from a phone more often than a desk.
 */
export function DishesPage({
  locale,
  onOpenCategories,
  onOpenBuilds,
  onOpenOffers,
}: DishesPageProps) {
  const { t } = useTranslation('menu')
  const categories = useCategories()
  const dishes = useDishes()

  const reorder = useReorderDishes()
  const availability = useDishAvailability()
  const remove = useDeleteDish()
  const show = useDishChoices()

  const [filter, setFilter] = useState<number | null>(null)
  const [dialog, setDialog] = useState<{ open: boolean; dish: Dish | null }>({
    open: false,
    dish: null,
  })
  const [pendingDelete, setPendingDelete] = useState<Dish | null>(null)

  // Derived from the query data so the effect below has a stable dependency.
  const categoryList = useMemo(() => categories.data?.data ?? [], [categories.data])
  const currency = dishes.data?.meta.currency ?? 'USD'
  const secondCurrency = dishes.data?.meta.second_currency ?? null
  // A build's dish is the Build your own page's, above the menu's search.
  const builds = useDishBuilds()
  const dishList = useMemo(
    () => (dishes.data?.data ?? []).filter((dish) => !builds || dish.builds.length === 0),
    [dishes.data, builds],
  )

  const orphanCount = useMemo(
    () => dishList.filter((dish) => dish.category_id === null).length,
    [dishList],
  )

  const visible = useMemo(() => {
    if (filter === null) return dishList
    if (filter === UNCATEGORISED) return dishList.filter((dish) => dish.category_id === null)
    return dishList.filter((dish) => dish.category_id === filter)
  }, [dishList, filter])

  const atLimit = isAtLimit(dishes.data?.meta)
  // The page needs both answers to say anything true (how many dishes, and
  // whether a category exists yet): until both are in, it shows its shape
  // only, so nothing pops in after the rest. Dishes already in hand stay on
  // screen while the categories load again.
  const loading = dishes.isPending || (categories.isPending && dishList.length === 0)
  const noCategories = !categories.isPending && categoryList.length === 0

  // Stable identities: every card takes these, so a new closure per card per
  // render would defeat the memo on DishCard and re-render the whole grid
  // whenever the dialog opens or the filter changes.
  const openEdit = useCallback((dish: Dish) => setDialog({ open: true, dish }), [])
  const confirmDelete = useCallback((dish: Dish) => setPendingDelete(dish), [])
  const { mutate: setAvailability } = availability
  const toggleAvailability = useCallback(
    (dish: Dish, isAvailable: boolean) => setAvailability({ id: dish.id, isAvailable }),
    [setAvailability],
  )

  // A category can be deleted while it is the active filter. Fall back to
  // "All" rather than showing an empty grid for a category that is gone.
  useEffect(() => {
    if (filter === null || filter === UNCATEGORISED) return
    if (categories.isPending) return
    if (!categoryList.some((category) => category.id === filter)) setFilter(null)
  }, [filter, categoryList, categories.isPending])

  const addButton = (
    <Button
      leadingIcon={<IconPlus className="size-[18px]" />}
      disabled={loading || atLimit || noCategories}
      onClick={() => setDialog({ open: true, dish: null })}
    >
      {t('dishesPage.add')}
    </Button>
  )

  return (
    <div className="flex flex-1 flex-col gap-4">
      <MenuSwitch value="dishes" onOpen={onOpenCategories} />

      <LimitHeader
        used={dishes.data?.meta.used ?? 0}
        limit={dishes.data?.meta.limit ?? null}
        loading={dishes.isPending}
        action={addButton}
      />

      {atLimit ? <Alert variant="warning">{t('dishesPage.atLimit')}</Alert> : null}

      {loading ? (
        <SkeletonList
          count={6}
          className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3 min-[118rem]:grid-cols-4"
          itemClassName="h-[132px]"
        />
      ) : noCategories && dishList.length === 0 ? (
        <PictureEmptyState
          fill
          picture="/assets/images/dashboard/no_dishes.webp"
          title={t('shared.addCategoryFirst')}
          description={t('dishesPage.noCategoriesDescription')}
          action={
            <Button block onClick={onOpenCategories}>
              {t('shared.goToCategories')}
            </Button>
          }
        />
      ) : (
        <>
          {noCategories ? (
            // Deleting a category keeps its dishes. They are still on the
            // menu and still count against the limit, so they must stay
            // visible and reassignable.
            <Alert
              variant="warning"
              title={t('dishesPage.orphansTitle')}
              action={{ label: t('shared.goToCategories'), onClick: onOpenCategories }}
            >
              {t('dishesPage.orphansDescription')}
            </Alert>
          ) : null}

          {categoryList.length > 0 ? (
            <CategoryFilter
              categories={categoryList}
              value={filter}
              onChange={setFilter}
              orphanCount={orphanCount}
              locale={locale}
            />
          ) : null}

          {dishes.isError ? (
            <ErrorState description={dishes.error.message} onRetry={() => void dishes.refetch()} />
          ) : dishList.length === 0 ? (
            <PictureEmptyState
              fill
              picture="/assets/images/dashboard/no_dishes.webp"
              title={t('dishesPage.emptyTitle')}
              description={t('dishesPage.emptyDescription')}
              action={
                <Button block onClick={() => setDialog({ open: true, dish: null })}>
                  {t('dishesPage.emptyAction')}
                </Button>
              }
            />
          ) : visible.length === 0 ? (
            <EmptyState
              icon={IconToolsKitchen2}
              title={t('dishesPage.emptyFilteredTitle')}
              description={t('dishesPage.emptyFilteredDescription')}
              action={
                <Button onClick={() => setDialog({ open: true, dish: null })}>
                  {t('dishesPage.emptyAction')}
                </Button>
              }
            />
          ) : (
            <SortableList
              items={visible}
              layout="grid"
              onReorder={(ordered) => reorder.mutate(ordered)}
            >
              {/* One column of rows on a phone; two from a tablet, three on a wide screen. */}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3 min-[118rem]:grid-cols-4">
                {visible.map((dish) => (
                  <SortableCard
                    key={dish.id}
                    id={dish.id}
                    handleClassName="-my-3 me-2 h-auto w-7 self-stretch rounded-none rounded-s-card bg-[var(--hover-wash)] text-[var(--muted)]"
                  >
                    {({ handle }) => (
                      <DishCard
                        dish={dish}
                        locale={locale}
                        handle={handle}
                        showVariants={show.variants}
                        showAddons={show.addons}
                        onEdit={openEdit}
                        onDelete={confirmDelete}
                        onToggleAvailability={toggleAvailability}
                      />
                    )}
                  </SortableCard>
                ))}
              </div>
            </SortableList>
          )}
        </>
      )}

      <DishDialog
        open={dialog.open}
        dish={dialog.dish}
        dishes={dishList}
        categories={categoryList}
        defaultCategoryId={filter === null || filter === UNCATEGORISED ? null : filter}
        currency={currency}
        secondCurrency={secondCurrency}
        locale={locale}
        onClose={() => setDialog({ open: false, dish: null })}
        onOpenCategories={onOpenCategories}
        onOpenBuilds={onOpenBuilds}
        onOpenOffers={onOpenOffers}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        loading={remove.isPending}
        title={t('dishesPage.deleteTitle')}
        description={
          pendingDelete?.offer
            ? `${t('dishesPage.deleteDescription')} ${t('dishesPage.deleteDeal', {
                title: nameOr(pendingDelete.offer.title, locale, t('dishCard.deal.untitledOffer')),
              })}`
            : t('dishesPage.deleteDescription')
        }
        confirmLabel={t('shared.delete')}
        onConfirm={() => {
          if (pendingDelete) {
            remove.mutate(pendingDelete.id, { onSuccess: () => setPendingDelete(null) })
          }
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
