import { IconFolderPlus } from '@tabler/icons-react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isAtLimit, LimitNotice } from '@/shared/components/data-display'
import { CategoryDialog } from '@/features/menu/categories/components/dialogs/category-dialog'
import { CategoryCard } from '@/features/menu/categories/components/list/category-card'
import {
  useCategories,
  useDeleteCategory,
  useReorderCategories,
} from '@/features/menu/categories/hooks/use-categories'
import type { Category } from '@/features/menu/categories/schemas/category.schema'
import { SortableCard, SortableList } from '@/features/menu/components/dnd'
import { ConfirmDialog, EmptyState, ErrorState, SkeletonList } from '@/shared/components/feedback'
import { Alert, Button, PageSwitch } from '@/shared/components/ui'
import type { Locale } from '@/shared/constants/locales'

export type CategoriesPageProps = {
  locale: Locale
  /** Lets the empty state send the owner on to add dishes. */
  onOpenDishes: () => void
}

/**
 * Categories, on their own page.
 *
 * They are the skeleton of a menu and change rarely, so they get a calm list
 * of their own rather than sharing a screen with the dishes grid.
 */
export function CategoriesPage({ locale, onOpenDishes }: CategoriesPageProps) {
  const { t } = useTranslation('menu')
  const categories = useCategories()
  const reorder = useReorderCategories()
  const remove = useDeleteCategory()

  const [dialog, setDialog] = useState<{ open: boolean; category: Category | null }>({
    open: false,
    category: null,
  })
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null)

  // Stable identities, so the memo on CategoryCard can bail out instead of
  // re-rendering every row whenever the dialog opens.
  const openEdit = useCallback((category: Category) => setDialog({ open: true, category }), [])
  const confirmDelete = useCallback((category: Category) => setPendingDelete(category), [])

  const list = categories.data?.data ?? []
  const atLimit = isAtLimit(categories.data?.meta)

  return (
    <div className="flex flex-1 flex-col gap-4">
      <PageSwitch
        label={t('nav.menu', { ns: 'common' })}
        value="categories"
        options={[
          { value: 'dishes', label: t('nav.dishes', { ns: 'common' }) },
          { value: 'categories', label: t('nav.categories', { ns: 'common' }) },
        ]}
        onOpen={onOpenDishes}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <LimitNotice
          used={categories.data?.meta.used ?? 0}
          limit={categories.data?.meta.limit ?? null}
        />
        <Button
          className="ms-auto"
          leadingIcon={<IconFolderPlus className="size-[18px]" />}
          disabled={atLimit}
          onClick={() => setDialog({ open: true, category: null })}
        >
          {t('categoriesPage.add')}
        </Button>
      </div>

      {atLimit ? <Alert variant="warning">{t('categoriesPage.atLimit')}</Alert> : null}

      {categories.isPending ? (
        <SkeletonList count={3} className="flex flex-col gap-3" itemClassName="h-[78px]" />
      ) : categories.isError ? (
        <ErrorState
          description={categories.error.message}
          onRetry={() => void categories.refetch()}
        />
      ) : list.length === 0 ? (
        <EmptyState
          fill
          icon={IconFolderPlus}
          title={t('categoriesPage.emptyTitle')}
          description={t('categoriesPage.emptyDescription')}
          action={
            <Button onClick={() => setDialog({ open: true, category: null })}>
              {t('categoriesPage.emptyAction')}
            </Button>
          }
        />
      ) : (
        <>
          <SortableList items={list} layout="list" onReorder={(ordered) => reorder.mutate(ordered)}>
            <div className="flex flex-col gap-3">
              {list.map((category) => (
                <SortableCard key={category.id} id={category.id}>
                  {({ handle }) => (
                    <CategoryCard
                      category={category}
                      locale={locale}
                      handle={handle}
                      onEdit={openEdit}
                      onDelete={confirmDelete}
                    />
                  )}
                </SortableCard>
              ))}
            </div>
          </SortableList>

          <Button variant="ghost" className="self-start" onClick={onOpenDishes}>
            {t('categoriesPage.goToDishes')}
          </Button>
        </>
      )}

      <CategoryDialog
        open={dialog.open}
        category={dialog.category}
        onClose={() => setDialog({ open: false, category: null })}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        loading={remove.isPending}
        title={t('categoriesPage.deleteTitle')}
        description={t('categoriesPage.deleteDescription')}
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
