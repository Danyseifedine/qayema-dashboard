import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Money, StatusChip } from '@/shared/components/data-display'
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/shared/components/feedback'
import { Alert, Button } from '@/shared/components/ui'
import type { Locale } from '@/shared/constants/locales'
import { languageDir, languageName } from '@/shared/constants/menu-languages'
import { nameOr } from '@/shared/utils/string/translated'
import type { Category } from '@/features/menu/categories/schemas/category.schema'
import { PosRowChip } from '@/features/menu/components/pos-notice'
import { AddonGroupsList } from '@/features/menu/dishes/components/options/addon-groups-list'
import type { Dish } from '@/features/menu/dishes/schemas/dish.schema'

export type PosDishDialogProps = {
  /** The dish shown; null while closed. */
  dish: Dish | null
  categories: Category[]
  /** The menu's languages, its main one first: every name is shown in each. */
  languages: readonly string[]
  locale: Locale
  onClose: () => void
}

/**
 * A dish while the menu comes from a POS: shown, not edited. The POS owns
 * its name, ingredients, price, category, photo, availability and choices;
 * one the owner made before the link is hidden from guests until they
 * disconnect, and says so.
 */
export function PosDishDialog({
  dish,
  categories,
  languages,
  locale,
  onClose,
}: PosDishDialogProps) {
  const { t } = useTranslation('menu')

  return (
    <Modal open={dish !== null} onClose={onClose} size="lg" className="overflow-y-auto">
      {dish ? (
        <>
          <ModalBody className="flex flex-col gap-4">
            <ModalHeader
              title={dish.from_pos ? t('pos.dishTitle') : t('pos.ownTitle')}
              description={dish.from_pos ? t('pos.dishDescription') : t('pos.ownDescription')}
            />

            <div className="flex items-start gap-3">
              {dish.image_url ? (
                <img
                  src={dish.image_url}
                  alt=""
                  className="size-[76px] shrink-0 rounded-card object-cover"
                />
              ) : null}
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                {languages.map((code) => (
                  <p
                    key={code}
                    dir={languageDir(code)}
                    lang={code}
                    className="text-[15px] leading-snug font-medium break-words"
                  >
                    {dish.name[code] || <span className="text-[var(--faint)]">-</span>}
                  </p>
                ))}
                <div className="flex flex-wrap items-center gap-1.5">
                  <StatusChip tone={dish.is_available ? 'success' : 'danger'}>
                    {dish.is_available ? t('pos.available') : t('pos.soldOut')}
                  </StatusChip>
                  <PosRowChip fromPos={dish.from_pos} removed={dish.pos_removed} />
                </div>
              </div>
            </div>

            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[13px]">
              <Fact label={t('pos.price')}>
                {dish.price === null ? (
                  '-'
                ) : (
                  <Money amount={Number(dish.price)} currency={dish.currency} />
                )}
              </Fact>
              <Fact label={t('pos.category')}>
                {categoryName(dish, categories, locale) ?? t('pos.noCategory')}
              </Fact>
              {languages.some((code) => dish.ingredients[code]) ? (
                <Fact label={t('pos.ingredients')}>
                  {languages.map((code) =>
                    dish.ingredients[code] ? (
                      <span key={code} dir={languageDir(code)} lang={code} className="block">
                        {languages.length > 1 ? (
                          <span className="text-[var(--faint)]">{languageName(code)}: </span>
                        ) : null}
                        {dish.ingredients[code]}
                      </span>
                    ) : null,
                  )}
                </Fact>
              ) : null}
            </dl>

            {dish.variants.length > 0 ? (
              <Choices
                title={t('pos.variants')}
                rows={dish.variants.map((variant) => ({
                  key: variant.id,
                  name: nameOr(variant.name, locale, ''),
                  options: variant.options.map((option) => ({
                    key: option.id,
                    name: nameOr(option.name, locale, ''),
                    price: Number(option.price),
                  })),
                }))}
                currency={dish.currency}
              />
            ) : null}

            {dish.addons.length > 0 ? (
              <Choices
                title={t('pos.addons')}
                rows={[
                  {
                    key: 0,
                    name: null,
                    options: dish.addons.map((addon) => ({
                      key: addon.id,
                      name: nameOr(addon.name, locale, ''),
                      price: Number(addon.price),
                    })),
                  },
                ]}
                currency={dish.currency}
              />
            ) : null}

            <AddonGroupsList
              groups={dish.addon_groups}
              language={locale}
              currency={dish.currency}
            />

            {dish.builds.length > 0 ? (
              <Alert variant="info" size="sm">
                {t('pos.buildsOff')}
              </Alert>
            ) : null}
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={onClose}>
              {t('pos.close')}
            </Button>
          </ModalFooter>
        </>
      ) : null}
    </Modal>
  )
}

function Fact({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <>
      <dt className="text-[var(--muted)]">{label}</dt>
      <dd className="min-w-0 break-words" dir="auto">
        {children}
      </dd>
    </>
  )
}

type ChoiceRow = {
  key: number
  /** The variant's name; null for the add-ons, which have none. */
  name: string | null
  options: { key: number; name: string; price: number }[]
}

function Choices({
  title,
  rows,
  currency,
}: {
  title: string
  rows: ChoiceRow[]
  currency: string
}) {
  return (
    <section className="flex flex-col gap-2">
      <h4 className="text-[13px] font-medium">{title}</h4>
      {rows.map((row) => (
        <div key={row.key} className="rounded-tile border-[0.5px] border-[var(--line)] px-3 py-2">
          {row.name ? <p className="text-[13px] font-medium">{row.name}</p> : null}
          <ul className="flex flex-col">
            {row.options.map((option) => (
              <li
                key={option.key}
                className="flex justify-between gap-3 text-[12.5px] text-[var(--muted)]"
              >
                <span className="min-w-0 truncate">{option.name}</span>
                {option.price > 0 ? (
                  <Money amount={option.price} currency={currency} prefix="+" />
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}

function categoryName(dish: Dish, categories: Category[], locale: Locale): string | null {
  const category = categories.find((each) => each.id === dish.category_id)
  return category ? nameOr(category.name, locale, '') || null : null
}
