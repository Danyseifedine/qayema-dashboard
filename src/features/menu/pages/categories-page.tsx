import { IconFolderPlus } from '@tabler/icons-react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CategoryDialog } from '@/features/menu/categories/components/dialogs/category-dialog'
import { CategoryCard } from '@/features/menu/categories/components/list/category-card'
import {
  useCategories,
  useDeleteCategory,
  useReorderCategories,
} from '@/features/menu/categories/hooks/use-categories'
import type { Category } from '@/features/menu/categories/schemas/category.schema'
import { SortableCard, SortableList } from '@/features/menu/components/dnd'
import { LimitNotice } from '@/shared/components/data-display/badges/limit-notice'
import { ConfirmDialog, EmptyState, ErrorState } from '@/shared/components/feedback'
import { Alert, Button } from '@/shared/components/ui'
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
  // An unlimited package reports a null limit, which is never reached.
  const atLimit =
    categories.data !== undefined &&
    categories.data.meta.limit !== null &&
    categories.data.meta.used >= categories.data.meta.limit

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <LimitNotice
          label={t('categoriesPage.title')}
          used={categories.data?.meta.used ?? 0}
          limit={categories.data?.meta.limit ?? null}
          description={t('categoriesPage.description')}
        />
        <Button
          size="sm"
          leadingIcon={<IconFolderPlus className="size-4" />}
          disabled={atLimit}
          onClick={() => setDialog({ open: true, category: null })}
        >
          {t('categoriesPage.add')}
        </Button>
      </div>

      {atLimit ? <Alert variant="warning">{t('categoriesPage.atLimit')}</Alert> : null}

      {categories.isPending ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="h-16 animate-pulse rounded-[14px] bg-[var(--hover-wash)]" />
          ))}
        </div>
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
            <div className="flex flex-col gap-2">
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
