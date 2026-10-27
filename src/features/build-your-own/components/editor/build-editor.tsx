import { zodResolver } from '@hookform/resolvers/zod'
import { IconArrowLeft, IconArrowRight } from '@tabler/icons-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm, useWatch, type FieldPath } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useMenuLanguages } from '@/features/auth'
import type { Category, Dish } from '@/features/menu'
import { ConfirmDialog } from '@/shared/components/feedback'
import { Form, OneLanguageNote } from '@/shared/components/forms'
import { Alert, Button, Stepper } from '@/shared/components/ui'
import type { Locale } from '@/shared/constants/locales'
import { useApiFormErrors } from '@/shared/hooks/use-api-form-errors'
import { useSubmitOnce } from '@/shared/hooks/use-submit-once'
import { useTranslateOnSave } from '@/shared/hooks/use-translate-on-save'
import { ApiError } from '@/shared/types/api'
import { toMenuTextForm } from '@/shared/utils/string/menu-text'
import { nameOr } from '@/shared/utils/string/translated'
import { useSaveBuiltDish } from '@/features/build-your-own/hooks/use-build-your-own'
import {
  makeBuildFormSchema,
  offeredDishes,
  tickedDishes,
  placeBuildErrors,
  savedBuildsPayload,
  toBuildForm,
  toBuildPayload,
  titleOf,
  type Build,
  type BuildFormInput,
  type BuildFormValues,
  type BuildPayload,
} from '@/features/build-your-own/schemas/build.schema'
import { missingBuildTranslations } from '@/features/build-your-own/utils/build-translations'
import {
  LAST_STEP,
  STEPS,
  errorPaths,
  firstStepWithError,
} from '@/features/build-your-own/components/editor/build-steps'
import { ChoicesStep } from '@/features/build-your-own/components/editor/choices-step'
import { KindStep } from '@/features/build-your-own/components/editor/kind-step'
import { MenuStep } from '@/features/build-your-own/components/editor/menu-step'
import { ReviewStep } from '@/features/build-your-own/components/editor/review-step'
import { SizesStep } from '@/features/build-your-own/components/editor/sizes-step'

export type BuildEditorProps = {
  /** Null makes a new build. */
  build: Build | null
  /** The saved build's dish, which the editor changes with it; null for a new build. */
  dish: Dish | null
  /** Every dish of the restaurant, in the owner's order. */
  dishes: readonly Dish[]
  categories: readonly Category[]
  /** The main currency: a new dish is priced in it. */
  currency: string
  /** Menu text's language, for the dishes' and categories' names. */
  locale: Locale
  onClose: () => void
}

/**
 * Making or changing a build, on a page of its own, one step at a time:
 * what guests build, what they choose from, the sizes, then the dish it is
 * on the menu (made with a new build, changed with a saved one), and what
 * the guest will see before it is saved. Next checks
 * only the open step. A saved build opens with every step reachable and
 * can be saved from any of them; a save the form or the server refuses
 * opens the first step with something to fix.
 */
export function BuildEditor({
  build,
  dish,
  dishes,
  categories,
  currency,
  locale,
  onClose,
}: BuildEditorProps) {
  const { t } = useTranslation('build-your-own')
  const languages = useMenuLanguages()
  const editing = build !== null
  const save = useSaveBuiltDish(dish?.id ?? null)

  const translation = useTranslateOnSave(languages)
  // While saving translates, a name in either language will do: the AI
  // fills the main one in (the form reads this on every render).
  const resolver = useMemo(() => zodResolver(makeBuildFormSchema(translation.on)), [translation.on])
  const form = useForm<BuildFormInput, unknown, BuildFormValues>({
    resolver,
    defaultValues: toBuildForm(build, dish, languages),
  })
  const { isDirty } = form.formState
  const { formError, setFormError, applyApiError, clearFormError } = useApiFormErrors(form.setError)

  // The build's dish (none yet for a new one), whose currency its
  // category's dishes must share, and which is never a choice of its own.
  // Of those the owner may tick, the ones guests then choose from.
  const categoryId = useWatch({ control: form.control, name: 'category_id' })
  const dishIds = useWatch({ control: form.control, name: 'dish_ids' })
  const dishCurrency = dish?.currency ?? currency
  const pickable = offeredDishes(dishes, categoryId, dish?.id ?? null, dishCurrency)
  const offered = tickedDishes(pickable, dishIds)
  const dishName = (name: Dish['name']) => nameOr(name, locale, t('card.untitled'))

  const [step, setStep] = useState(0)
  const [reached, setReached] = useState(editing ? LAST_STEP : 0)
  const [leaving, setLeaving] = useState(false)

  const open = (next: number) => {
    setStep(next)
    setReached((furthest) => Math.max(furthest, next))
  }

  // The page opens at its title, and each step at its heading, which a
  // screen reader then reads.
  const title = useRef<HTMLHeadingElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => title.current?.focus(), [])
  const shownStep = useRef(step)
  useEffect(() => {
    if (shownStep.current === step) return
    shownStep.current = step
    heading.current?.focus()
  }, [step])

  /** Forward only past steps that hold up (to the first that does not); back always. */
  const go = async (next: number) => {
    const passed: FieldPath<BuildFormInput>[] = STEPS.slice(step, Math.max(step, next)).flatMap(
      (each) => each.fields,
    )
    if (passed.length > 0 && !(await form.trigger(passed, { shouldFocus: true }))) {
      const wrong = errorPaths(form.formState.errors).filter((path) =>
        (passed as string[]).includes(path.split('.')[0]!),
      )
      open(firstStepWithError(wrong) ?? step)
      return
    }
    open(next)
  }

  /** A refused save: each message under its field, and the first step with one opened. */
  const refused = (sent: BuildPayload[], index: number) => (error: unknown) => {
    const placed = placeBuildErrors(error, sent, index)
    applyApiError(placed.error)
    if (placed.unplaced !== null) setFormError(placed.unplaced)
    const names = placed.error instanceof ApiError ? Object.keys(placed.error.errors ?? {}) : []
    const first = firstStepWithError(names)
    if (first !== null) open(first)
  }

  const send = (values: BuildFormValues, done: () => void) => {
    // The dish's other builds go back as they are; this one takes its
    // place, or goes last when it is new.
    const saved = dish ? savedBuildsPayload(dish, dishes, languages) : []
    const at = build && dish ? dish.builds.findIndex((each) => each.id === build.id) : -1
    const index = at === -1 ? saved.length : at
    const builds = [
      ...saved.slice(0, index),
      toBuildPayload({ ...values, name: titleOf(values) }, dishes, dish?.id ?? null),
      ...saved.slice(index + 1),
    ]
    // The dish is its name and icon above the menu's search: no category,
    // price, description or photo (a dish made before keeps none of them).
    save.mutate(
      {
        name: values.dish.name,
        icon: values.dish.icon,
        category_id: null,
        price: null,
        ingredients: toMenuTextForm(null, languages),
        ...(dish?.image_url ? { delete_image: true } : {}),
        builds,
      },
      { onSuccess: onClose, onError: refused(builds, index), onSettled: done },
    )
  }

  // Saving fills in, with the writing help, every name written in one
  // language only, in one AI use; the form shows them too, should the save
  // be refused.
  const once = useSubmitOnce()
  const submit = form.handleSubmit(
    (values) =>
      once((done) => {
        clearFormError()
        translation.fill(values, missingBuildTranslations(values, languages), {
          save: (filled) => send(filled, done),
          show: (path, text) => form.setValue(path as FieldPath<BuildFormInput>, text),
        })
      }),
    (errors) => open(firstStepWithError(errorPaths(errors)) ?? step),
  )

  const busy = save.isPending || translation.busy
  const leave = () => (isDirty ? setLeaving(true) : onClose())
  const stepId = STEPS[step]!.id

  return (
    <div className="flex w-full flex-1 flex-col gap-5">
      <div className="flex flex-col gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="-ms-3 self-start"
          leadingIcon={<IconArrowLeft aria-hidden className="size-4 rtl:rotate-180" />}
          onClick={leave}
          aria-label={t('editor.backLabel')}
        >
          {t('editor.back')}
        </Button>
        <h2
          ref={title}
          tabIndex={-1}
          className="font-display text-[24px] leading-tight tracking-[-0.02em] outline-none"
        >
          {editing ? t('editor.titleEdit') : t('editor.titleNew')}
        </h2>
      </div>

      <Stepper
        label={t('stepper.label')}
        steps={STEPS.map((each) => ({ id: each.id, name: t(`steps.${each.id}`) }))}
        current={step}
        reached={reached}
        onGo={(next) => void go(next)}
      />

      <Form onSubmit={(event) => void submit(event)} className="flex flex-1 flex-col gap-0">
        <div className="flex min-w-0 flex-col gap-4 glass-card rounded-card p-3.5 sm:p-4">
          <h3
            ref={heading}
            tabIndex={-1}
            className="font-display text-[20px] leading-tight outline-none"
          >
            {t(`headings.${stepId}`)}
          </h3>

          {translation.on && stepId !== 'kind' ? <OneLanguageNote languages={languages} /> : null}
          {formError ? <Alert variant="error">{formError}</Alert> : null}

          {stepId === 'kind' ? (
            <KindStep form={form} languages={languages} categories={categories} />
          ) : stepId === 'choices' ? (
            <ChoicesStep
              form={form}
              categories={categories}
              pickable={pickable}
              currency={dishCurrency}
              locale={locale}
              languages={languages}
            />
          ) : stepId === 'sizes' ? (
            <SizesStep
              form={form}
              offered={offered}
              currency={dishCurrency}
              dishName={dishName}
              languages={languages}
            />
          ) : stepId === 'menu' ? (
            <MenuStep control={form.control} languages={languages} />
          ) : (
            <ReviewStep
              control={form.control}
              categories={categories}
              offered={offered}
              currency={dishCurrency}
              locale={locale}
              dishName={dishName}
              onEdit={open}
            />
          )}
        </div>

        {/* Kept in reach while the step scrolls, above a phone's bottom bar.
            On a narrow phone, Back is its arrow alone, so three buttons fit. */}
        <div className="sticky-actions mt-4 flex flex-wrap items-center gap-2 pt-3">
          {step > 0 ? (
            <Button
              variant="ghost"
              className="max-sm:px-3"
              leadingIcon={<IconArrowLeft aria-hidden className="size-4 rtl:rotate-180" />}
              onClick={() => open(step - 1)}
              disabled={busy}
              aria-label={t('editor.previous')}
            >
              <span className="max-sm:sr-only">{t('editor.previous')}</span>
            </Button>
          ) : null}
          <span className="flex-1" />
          {step < LAST_STEP ? (
            <Button
              variant={editing ? 'secondary' : 'primary'}
              onClick={() => void go(step + 1)}
              disabled={busy}
            >
              {t('editor.next')}
              <IconArrowRight aria-hidden className="ms-1.5 size-4 rtl:rotate-180" />
            </Button>
          ) : null}
          {editing || step === LAST_STEP ? (
            <Button type="submit" loading={busy}>
              {editing ? t('editor.save') : t('editor.add')}
            </Button>
          ) : null}
        </div>
      </Form>

      <ConfirmDialog
        open={leaving}
        loading={false}
        title={t('editor.leaveTitle')}
        description={t('editor.leaveDescription')}
        confirmLabel={t('editor.leaveConfirm')}
        onConfirm={onClose}
        onCancel={() => setLeaving(false)}
      />
    </div>
  )
}
