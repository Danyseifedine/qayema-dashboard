import { LayoutList, Plus, UtensilsCrossed } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useCategories } from '../categories/hooks/use-categories'
import { CategoryFilter, UNCATEGORISED } from '../components/builder/category-filter'
import { SortableCard, SortableList } from '../components/dnd'
import { LimitNotice } from '../components/limits/limit-notice'
import { DishDialog } from '../dishes/components/dialogs/dish-dialog'
import { DishCard } from '../dishes/components/list/dish-card'
import {
  useDeleteDish,
  useDishAvailability,
  useDishes,
  useReorderDishes,
} from '../dishes/hooks/use-dishes'
import type { Dish } from '../dishes/schemas/dish.schema'
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

  const atLimit = dishes.data !== undefined && dishes.data.meta.used >= dishes.data.meta.limit
  const noCategories = !categories.isPending && categoryList.length === 0

  // A category can be deleted while it is the active filter. Fall back to
  // "All" rather than showing an empty grid for a category that is gone.
  useEffect(() => {
    if (filter === null || filter === UNCATEGORISED) return
    if (categories.isPending) return
    if (!categoryList.some((category) => category.id === filter)) setFilter(null)
  }, [filter, categoryList, categories.isPending])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <LimitNotice
          label="Dishes"
          used={dishes.data?.meta.used ?? 0}
          limit={dishes.data?.meta.limit ?? 0}
        />
        <Button
          size="sm"
          leadingIcon={<Plus className="size-4" />}
          disabled={atLimit || noCategories}
          onClick={() => setDialog({ open: true, dish: null })}
        >
          Add dish
        </Button>
      </div>

      {atLimit ? (
        <Alert variant="warning">
          You have used every dish your plan allows. Delete one to add another.
        </Alert>
      ) : null}

      {noCategories && dishList.length === 0 ? (
        <EmptyState
          icon={LayoutList}
          title="Add a category first"
          description="Every dish belongs to a category, so your menu has some structure before you start filling it."
          action={<Button onClick={onOpenCategories}>Go to categories</Button>}
        />
      ) : (
        <>
          {noCategories ? (
            // Deleting a category keeps its dishes. They are still on the
            // menu and still count against the limit, so they must stay
            // visible and reassignable.
            <Alert variant="warning" title="These dishes have no category">
              Their category was deleted. Add a category, then edit each dish to move it there.
              <div className="mt-2">
                <Button size="sm" onClick={onOpenCategories}>
                  Go to categories
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
              icon={UtensilsCrossed}
              title={dishList.length === 0 ? 'No dishes yet' : 'Nothing in this category'}
              description={
                dishList.length === 0
                  ? 'Add your first dish with a name, a price and a photo.'
                  : 'Add a dish here, or pick another category above.'
              }
              action={
                <Button onClick={() => setDialog({ open: true, dish: null })}>Add a dish</Button>
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
                  <SortableCard key={dish.id} id={dish.id}>
                    {({ handle }) => (
                      <DishCard
                        dish={dish}
                        currency={currency}
                        locale={locale}
                        handle={handle}
                        onEdit={() => setDialog({ open: true, dish })}
                        onDelete={() => setPendingDelete(dish)}
                        onToggleAvailability={(isAvailable) =>
                          availability.mutate({ id: dish.id, isAvailable })
                        }
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
        destructive
        loading={remove.isPending}
        title="Delete this dish?"
        description="This removes the dish and its photo from your menu. It cannot be undone."
        confirmLabel="Delete"
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
