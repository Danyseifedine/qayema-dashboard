import { LayoutList, Plus, UtensilsCrossed } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCategories } from '@/features/menu/categories/hooks/use-categories'
import { CategoryFilter, UNCATEGORISED } from '@/features/menu/components/builder/category-filter'
import { SortableCard, SortableList } from '@/features/menu/components/dnd'
import { LimitNotice } from '@/shared/components/data-display/badges/limit-notice'
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
  CardGridSkeleton,
  ConfirmDialog,
  EmptyState,
  ErrorState,
} from '@/shared/components/feedback'
import { Alert, Button } from '@/shared/components/ui'
import type { Locale } from '@/shared/constants/locales'

export type DishesPageProps = {
  locale: Locale
  /** A dish needs a category, so the empty state can send the owner there. */
  onOpenCategories: () => void
}

/**
 * Dishes, on their own page.
 *
 * A card grid filtered by the category chips. Cards rather than a table,
 * because this is edited from a phone more often than a desk.
 */
export function DishesPage({ locale, onOpenCategories }: DishesPageProps) {
  const { t } = useTranslation('menu')
  const categories = useCategories()
  const dishes = useDishes()

  const reorder = useReorderDishes()
  const availability = useDishAvailability()
  const remove = useDeleteDish()

  const [filter, setFilter] = useState<number | null>(null)
  const [dialog, setDialog] = useState<{ open: boolean; dish: Dish | null }>({
    open: false,
    dish: null,
  })
  const [pendingDelete, setPendingDelete] = useState<Dish | null>(null)

  // Derived from the query data so the effect below has a stable dependency.
  const categoryList = useMemo(() => categories.data?.data ?? [], [categories.data])
  const currency = dishes.data?.meta.currency ?? 'USD'
  const dishList = useMemo(() => dishes.data?.data ?? [], [dishes.data])

  const orphanCount = useMemo(
    () => dishList.filter((dish) => dish.category_id === null).length,
    [dishList],
  )

  const visible = useMemo(() => {
    if (filter === null) return dishList
    if (filter === UNCATEGORISED) return dishList.filter((dish) => dish.category_id === null)
    return dishList.filter((dish) => dish.category_id === filter)
  }, [dishList, filter])

  // An unlimited package reports a null limit, which is never reached.
  const atLimit =
    dishes.data !== undefined &&
    dishes.data.meta.limit !== null &&
    dishes.data.meta.used >= dishes.data.meta.limit
  const noCategories = !categories.isPending && categoryList.length === 0

  // Stable identities: every card takes these, so a new closure per card per
  // render would defeat the memo on DishCard and re-render the whole grid
  // whenever the dialog opens or the filter changes.
  const openEdit = useCallback((dish: Dish) => setDialog({ open: true, dish }), [])
  const confirmDelete = useCallback((dish: Dish) => setPendingDelete(dish), [])
  const toggleAvailability = useCallback(
    (dish: Dish, isAvailable: boolean) => availability.mutate({ id: dish.id, isAvailable }),
    [availability],
  )

  // A category can be deleted while it is the active filter. Fall back to
  // "All" rather than showing an empty grid for a category that is gone.
  useEffect(() => {
    if (filter === null || filter === UNCATEGORISED) return
    if (categories.isPending) return
    if (!categoryList.some((category) => category.id === filter)) setFilter(null)
  }, [filter, categoryList, categories.isPending])

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <LimitNotice
          label={t('dishesPage.title')}
          used={dishes.data?.meta.used ?? 0}
          limit={dishes.data?.meta.limit ?? null}
          description={t('dishesPage.description')}
        />
        <Button
          size="sm"
          leadingIcon={<Plus className="size-4" />}
          disabled={atLimit || noCategories}
          onClick={() => setDialog({ open: true, dish: null })}
        >
          {t('dishesPage.add')}
        </Button>
      </div>

      {atLimit ? <Alert variant="warning">{t('dishesPage.atLimit')}</Alert> : null}

      {noCategories && dishList.length === 0 ? (
        <EmptyState
          fill
          icon={LayoutList}
          title={t('shared.addCategoryFirst')}
          description={t('dishesPage.noCategoriesDescription')}
          action={<Button onClick={onOpenCategories}>{t('shared.goToCategories')}</Button>}
        />
      ) : (
        <>
          {noCategories ? (
            // Deleting a category keeps its dishes. They are still on the
            // menu and still count against the limit, so they must stay
            // visible and reassignable.
            <Alert variant="warning" title={t('dishesPage.orphansTitle')}>
              {t('dishesPage.orphansDescription')}
              <div className="mt-2">
                <Button size="sm" onClick={onOpenCategories}>
                  {t('shared.goToCategories')}
                </Button>
              </div>
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

          {dishes.isPending ? (
            <CardGridSkeleton />
          ) : dishes.isError ? (
            <ErrorState description={dishes.error.message} onRetry={() => void dishes.refetch()} />
          ) : visible.length === 0 ? (
            <EmptyState
              fill
              icon={UtensilsCrossed}
              title={
                dishList.length === 0
                  ? t('dishesPage.emptyTitle')
                  : t('dishesPage.emptyFilteredTitle')
              }
              description={
                dishList.length === 0
                  ? t('dishesPage.emptyDescription')
                  : t('dishesPage.emptyFilteredDescription')
              }
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {visible.map((dish) => (
                  <SortableCard key={dish.id} id={dish.id} overlayHandle>
                    {({ handle }) => (
                      <DishCard
                        dish={dish}
                        currency={currency}
                        locale={locale}
                        handle={handle}
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
        categories={categoryList}
        defaultCategoryId={filter === null || filter === UNCATEGORISED ? null : filter}
        currency={currency}
        locale={locale}
        onClose={() => setDialog({ open: false, dish: null })}
        onOpenCategories={onOpenCategories}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        loading={remove.isPending}
        title={t('dishesPage.deleteTitle')}
        description={t('dishesPage.deleteDescription')}
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
