import { zodResolver } from '@hookform/resolvers/zod'
import { IconArrowLeft, IconArrowRight } from '@tabler/icons-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm, useWatch, type FieldErrors, type Resolver } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useMenuLanguages } from '@/features/auth'
import { imageChanges } from '@/features/uploads'
import { ConfirmDialog } from '@/shared/components/feedback'
import { Form } from '@/shared/components/forms'
import { Alert, Button, Stepper } from '@/shared/components/ui'
import type { Locale } from '@/shared/constants/locales'
import { mainLanguageOf } from '@/shared/constants/menu-languages'
import { cn } from '@/shared/utils/dom/cn'
import { formatMoney } from '@/shared/utils/format/money'
import { useApiFormErrors } from '@/shared/hooks/use-api-form-errors'
import { useSubmitOnce } from '@/shared/hooks/use-submit-once'
import { ApiError } from '@/shared/types/api'
import { useOfferLook } from '@/features/offers/hooks/use-offer-look'
import { useSaveOffer } from '@/features/offers/hooks/use-offers'
import { usePricedDishes } from '@/features/offers/hooks/use-priced-dishes'
import {
  offerFormSchema,
  toOfferForm,
  toOfferPayload,
  type Offer,
  type OfferFormValues,
  type OfferSlots,
} from '@/features/offers/schemas/offer.schema'
import { amountTooBig, type PricedDish } from '@/features/offers/utils/discount'
import { ContentStep } from '@/features/offers/components/editor/content-step'
import { LivePreview } from '@/features/offers/components/editor/live-preview'
import {
  LAST_STEP,
  SERVER_NAMES,
  STEPS,
  firstStepWithError,
} from '@/features/offers/components/editor/offer-steps'
import { ReviewStep } from '@/features/offers/components/editor/review-step'
import { ScheduleSection } from '@/features/offers/components/editor/schedule-section'
import { TapStep } from '@/features/offers/components/editor/tap-step'
import { WhereStep } from '@/features/offers/components/editor/where-step'

export type OfferEditorProps = {
  /** Null creates a new offer. */
  offer: Offer | null
  /** Every offer and the package's slots, so a full place is closed; undefined while loading. */
  offers?: readonly Offer[]
  slots?: OfferSlots
  /** The main currency, which an amount off is in. */
  currency: string
  /** The one other currency a dish (a deal dish too) may be priced in; null for none. */
  secondCurrency: string | null
  /** Main per one of the second currency; null without one. */
  exchangeRate: string | null
  timezone: string
  locale: Locale
  onClose: () => void
  /** A deal dish goes in a category: the way to make one. */
  onOpenCategories: () => void
}

/** The field names of every error the form holds, nested ones by their top field. */
function errorNames(errors: FieldErrors<OfferFormValues>): string[] {
  return Object.keys(errors).filter((name) => name !== 'root')
}

/** The deal dish's texts refused whole (the package's dishes all used): said in the main language. */
const DEAL_TEXTS = new Set(['deal.name', 'deal.ingredients'])

/**
 * A refused save with the server's names for fields put in the form's
 * (image_key is image, a deal dish's name refused whole is its main
 * language's).
 */
function inFormNames(error: unknown, main: string): unknown {
  if (!(error instanceof ApiError) || !error.errors) return error
  const errors = Object.fromEntries(
    Object.entries(error.errors).map(([field, messages]) => [
      DEAL_TEXTS.has(field) ? `${field}.${main}` : (SERVER_NAMES[field] ?? field),
      messages,
    ]),
  )
  return new ApiError({
    message: error.message,
    status: error.status,
    code: error.code,
    errors,
    body: error.body,
  })
}

/**
 * Making or changing an offer, on a page of its own, one step at a time:
 * the picture and its words, where it shows and in what shape, what a tap
 * does and the discount, when it runs, then everything at a glance before
 * it is saved. Next checks only the open step. A saved offer opens with
 * every step reachable and can be saved from any of them; a save the form
 * or the server refuses opens the first step with something to fix.
 */
export function OfferEditor({
  offer,
  offers,
  slots,
  currency,
  secondCurrency,
  exchangeRate,
  timezone,
  locale,
  onClose,
  onOpenCategories,
}: OfferEditorProps) {
  const { t } = useTranslation('offers')
  const save = useSaveOffer(offer?.id ?? null)
  const languages = useMenuLanguages()
  const editing = offer !== null

  // The dishes' prices, for the check a fixed amount needs (the server's
  // own): read by the resolver, so a refetch never rebuilds the form.
  const { data: dishes } = usePricedDishes({ locale, currency, exchangeRate })
  const priced = useRef<readonly PricedDish[]>([])
  useEffect(() => {
    priced.current = dishes ?? []
  }, [dishes])

  // The form's rules, and a fixed amount that would take all of a chosen
  // dish's price refused on the amount, as the server refuses it.
  const resolver = useMemo<Resolver<OfferFormValues>>(() => {
    const rules = zodResolver(offerFormSchema) as Resolver<OfferFormValues>
    return async (values, context, options) => {
      const result = await rules(values, context, options)
      const dish = values.gives === 'discount' ? amountTooBig(values, priced.current) : null
      if (dish === null || result.errors.discount_value) return result
      return {
        values: {},
        errors: {
          ...result.errors,
          discount_value: {
            type: 'custom',
            message: t('validation.amountTooBig', {
              dish: dish.name,
              price: formatMoney(Number(dish.price), dish.currency),
            }),
          },
        },
      }
    }
  }, [t])

  const form = useForm<OfferFormValues>({
    resolver,
    defaultValues: toOfferForm(offer, languages),
  })
  const { isDirty } = form.formState
  const { formError, applyApiError, clearFormError } = useApiFormErrors(form.setError)
  const look = useOfferLook(form.control, { savedUrl: offer?.image_url ?? null, locale })

  // A new deal dish is named after the offer while its name is still the
  // one filled in (the owner has not written their own).
  const offerTitle = useWatch({ control: form.control, name: 'title' })
  const savedDeal = offer?.deal ?? null
  const filledName = useRef(JSON.stringify(form.getValues('deal.name')))
  useEffect(() => {
    if (savedDeal !== null) return
    if (JSON.stringify(form.getValues('deal.name')) !== filledName.current) return
    form.setValue('deal.name', offerTitle)
    filledName.current = JSON.stringify(form.getValues('deal.name'))
  }, [offerTitle, savedDeal, form])

  const [step, setStep] = useState(0)
  const [reached, setReached] = useState(editing ? LAST_STEP : 0)
  // Where the owner goes once they agree to drop their changes; null while not asked.
  const [leaving, setLeaving] = useState<(() => void) | null>(null)

  const open = (target: number) => {
    setStep(target)
    setReached((furthest) => Math.max(furthest, target))
  }

  // The page opens at its title (scrolled to, if the list was scrolled),
  // and each step at its heading, which a screen reader then reads.
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
  const go = async (target: number) => {
    const passed = STEPS.slice(step, Math.max(step, target)).flatMap((each) => each.fields)
    if (passed.length > 0 && !(await form.trigger(passed, { shouldFocus: true }))) {
      open(firstStepWithError(passed.filter((name) => form.getFieldState(name).invalid)) ?? step)
      return
    }
    open(target)
  }

  const once = useSubmitOnce()
  const submit = form.handleSubmit(
    (values) =>
      once((done) => {
        clearFormError()
        save.mutate(
          { ...toOfferPayload(values), ...imageChanges(values.image, 'image_key', 'delete_image') },
          {
            onSuccess: onClose,
            onError: (error) => {
              applyApiError(inFormNames(error, mainLanguageOf(languages)))
              const refused = error instanceof ApiError ? Object.keys(error.errors ?? {}) : []
              const first = firstStepWithError(refused)
              if (first !== null) open(first)
            },
            onSettled: done,
          },
        )
      }),
    (errors) => open(firstStepWithError(errorNames(errors)) ?? step),
  )

  const leave = (to: () => void = onClose) => (isDirty ? setLeaving(() => to) : to())
  const stepId = STEPS[step]!.id

  return (
    // The whole width of the page. On a wide screen the step sits beside the
    // offer drawn live (the review step draws it itself, so it takes both
    // columns); on a phone it is one column.
    <div className="flex w-full flex-1 flex-col gap-5">
      <div className="flex flex-col gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="-ms-3 self-start"
          leadingIcon={<IconArrowLeft aria-hidden className="size-4 rtl:rotate-180" />}
          onClick={() => leave()}
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
        onGo={(target) => void go(target)}
      />

      <Form
        onSubmit={(event) => void submit(event)}
        className="grid flex-1 grid-cols-1 content-start gap-x-8 gap-y-0 xl:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]"
      >
        <div
          className={cn(
            'flex min-w-0 flex-col gap-4 glass-card rounded-card p-3.5 sm:p-4',
            stepId === 'review' && 'xl:col-span-2',
          )}
        >
          <h3
            ref={heading}
            tabIndex={-1}
            className="font-display text-[20px] leading-tight outline-none"
          >
            {t(`steps.${stepId}`)}
          </h3>

          {formError ? <Alert variant="error">{formError}</Alert> : null}

          {stepId === 'content' ? (
            <ContentStep control={form.control} savedUrl={offer?.image_url ?? null} />
          ) : stepId === 'where' ? (
            <WhereStep
              control={form.control}
              look={look}
              slots={offers && slots ? { offers, slots, offer } : null}
            />
          ) : stepId === 'tap' ? (
            <TapStep
              control={form.control}
              setValue={form.setValue}
              languages={languages}
              currency={currency}
              secondCurrency={secondCurrency}
              exchangeRate={exchangeRate}
              locale={locale}
              savedDealPhoto={savedDeal?.image_url ?? null}
              onOpenCategories={() => leave(onOpenCategories)}
            />
          ) : stepId === 'when' ? (
            <ScheduleSection control={form.control} timezone={timezone} />
          ) : (
            <ReviewStep
              control={form.control}
              look={look}
              currency={currency}
              locale={locale}
              savedDealPhoto={savedDeal?.thumb_url ?? null}
              onEdit={open}
            />
          )}
        </div>

        {stepId === 'review' ? null : (
          <aside className="hidden self-start xl:sticky xl:top-6 xl:block">
            <LivePreview control={form.control} look={look} />
          </aside>
        )}

        {/* Kept in reach while the step scrolls, above a phone's bottom bar,
            as wide as the editor. On a narrow phone, Back is its arrow
            alone, so three buttons fit. */}
        <div className="sticky-actions mt-4 flex flex-wrap items-center gap-2 pt-3 xl:col-span-2">
          {step > 0 ? (
            <Button
              variant="ghost"
              className="max-sm:px-3"
              leadingIcon={<IconArrowLeft aria-hidden className="size-4 rtl:rotate-180" />}
              onClick={() => open(step - 1)}
              disabled={save.isPending}
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
              disabled={save.isPending}
            >
              {t('editor.next')}
              <IconArrowRight aria-hidden className="ms-1.5 size-4 rtl:rotate-180" />
            </Button>
          ) : null}
          {editing || step === LAST_STEP ? (
            <Button type="submit" loading={save.isPending}>
              {editing ? t('editor.save') : t('editor.add')}
            </Button>
          ) : null}
        </div>
      </Form>

      <ConfirmDialog
        open={leaving !== null}
        loading={false}
        title={t('editor.leaveTitle')}
        description={t('editor.leaveDescription')}
        confirmLabel={t('editor.leaveConfirm')}
        onConfirm={() => leaving?.()}
        onCancel={() => setLeaving(null)}
      />
    </div>
  )
}
