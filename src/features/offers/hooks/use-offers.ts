import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseQueryResult,
} from '@tanstack/react-query'
import { sessionKeys } from '@/features/auth'
import { categoryKeys, dishKeys } from '@/features/menu'
import { t } from '@/lib/i18n'
import { toast } from '@/shared/components/feedback'
import type { ApiError } from '@/shared/types/api'
import {
  createOffer,
  deleteOffer,
  fetchOffers,
  reorderOffers,
  setOfferActive,
  updateOffer,
} from '@/features/offers/api/offer.api'
import type { Offer, OfferList, OfferPayload } from '@/features/offers/schemas/offer.schema'
import { offerKeys } from '@/features/offers/hooks/offer-keys'

/**
 * A deal dish made, changed or gone with its offer: the dishes, their
 * categories' counts and the session's count of dishes are fetched again.
 */
function refreshDeal(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: dishKeys.all })
  void queryClient.invalidateQueries({ queryKey: categoryKeys.all })
  void queryClient.invalidateQueries({ queryKey: sessionKeys.current() })
}

/** Every offer, in the owner's order, with the counts and the restaurant's timezone. */
export function useOffers(): UseQueryResult<OfferList, ApiError> {
  return useQuery<OfferList, ApiError>({
    queryKey: offerKeys.list(),
    queryFn: ({ signal }) => fetchOffers(signal),
  })
}

/** Add or edit. The list carries each offer's status, so it is fetched again either way. */
export function useSaveOffer(id: number | null) {
  const queryClient = useQueryClient()

  return useMutation<Offer, ApiError, OfferPayload>({
    mutationFn: (payload) => (id === null ? createOffer(payload) : updateOffer(id, payload)),
    onSuccess: (_offer, payload) => {
      toast.success(id === null ? t('offers:toast.added') : t('offers:toast.saved'))
      void queryClient.invalidateQueries({ queryKey: offerKeys.all })
      if (payload.deal !== undefined) refreshDeal(queryClient)
    },
    onError: (error) =>
      toast.error(id === null ? t('offers:toast.addFailed') : t('offers:toast.saveFailed'), error),
  })
}

/**
 * Pause or resume, on the card at once: the switch moves before the
 * answer, and snaps back with a toast if the server refuses.
 */
export function useSetOfferActive() {
  const queryClient = useQueryClient()

  return useMutation<Offer, ApiError, { id: number; active: boolean }, { previous?: OfferList }>({
    mutationFn: ({ id, active }) => setOfferActive(id, active),

    onMutate: async ({ id, active }) => {
      await queryClient.cancelQueries({ queryKey: offerKeys.list() })
      const previous = queryClient.getQueryData<OfferList>(offerKeys.list())

      if (previous) {
        queryClient.setQueryData<OfferList>(offerKeys.list(), {
          ...previous,
          data: previous.data.map((offer) =>
            offer.id === id ? { ...offer, is_active: active } : offer,
          ),
        })
      }

      return { previous }
    },

    // The answer carries the offer's new status ("Live now", "Paused"); a
    // deal dish says it too, on the Dishes page.
    onSuccess: (saved) => {
      if (saved.deal !== null) void queryClient.invalidateQueries({ queryKey: dishKeys.all })
      queryClient.setQueryData<OfferList>(offerKeys.list(), (current) =>
        current === undefined
          ? current
          : {
              ...current,
              data: current.data.map((offer) => (offer.id === saved.id ? saved : offer)),
            },
      )
    },

    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(offerKeys.list(), context.previous)
      }
      toast.error(t('offers:toast.pauseFailed'), error)
    },
  })
}

export function useDeleteOffer() {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError, number>({
    mutationFn: deleteOffer,
    onSuccess: (_nothing, id) => {
      toast.success(t('offers:toast.removed'))
      // Its deal dish goes with it.
      const gone = queryClient
        .getQueryData<OfferList>(offerKeys.list())
        ?.data.find((offer) => offer.id === id)
      if (gone?.deal) refreshDeal(queryClient)
      void queryClient.invalidateQueries({ queryKey: offerKeys.all })
    },
    onError: (error) => toast.error(t('offers:toast.removeFailed'), error),
  })
}

/** A new order, on screen at once; the server's answer replaces it. */
export function useReorderOffers() {
  const queryClient = useQueryClient()

  return useMutation<Offer[], ApiError, Offer[], { previous?: OfferList }>({
    mutationFn: (ordered) => reorderOffers(ordered.map((offer) => offer.id)),

    onMutate: async (ordered) => {
      await queryClient.cancelQueries({ queryKey: offerKeys.list() })
      const previous = queryClient.getQueryData<OfferList>(offerKeys.list())

      if (previous) {
        queryClient.setQueryData<OfferList>(offerKeys.list(), { ...previous, data: ordered })
      }

      return { previous }
    },

    onSuccess: (ordered) => {
      queryClient.setQueryData<OfferList>(offerKeys.list(), (current) =>
        current === undefined ? current : { ...current, data: ordered },
      )
    },

    onError: (error, _ordered, context) => {
      if (context?.previous) {
        queryClient.setQueryData(offerKeys.list(), context.previous)
      }
      toast.error(t('offers:toast.reorderFailed'), error)
      void queryClient.invalidateQueries({ queryKey: offerKeys.all })
    },
  })
}
