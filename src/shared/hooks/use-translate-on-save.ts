import {
  spentFor,
  useTranslateMany,
  useTranslatingMany,
  useWritingHelp,
} from '@/shared/hooks/use-writing-help'
import {
  piecesOf,
  withTranslations,
  type MissingTranslation,
} from '@/shared/utils/string/missing-translations'

/**
 * Saving a menu form (a dish, a category) first fills in, with the writing
 * help, every text written in one language only, in one AI use. `on` says
 * whether it will: the writing help is on, neither today's uses nor this
 * month's credits are spent, and the menu has two languages. `fill` hands `save` the values with the
 * translations in (each also given to `show`, so the form holds them should
 * the save be refused), or as written when it is off or fails (the failure
 * toasts). `tidy` rewrites a translation first, e.g. ingredients into a list.
 */
export function useTranslateOnSave(languages: readonly string[]) {
  const { uses } = useWritingHelp()
  const translate = useTranslateMany()
  const translating = useTranslatingMany()
  const on = uses !== null && spentFor(uses, 'translation') === null && languages.length > 1

  function fill<T extends object>(
    values: T,
    missing: MissingTranslation[],
    {
      save,
      show,
      tidy = (_piece, text) => text,
    }: {
      save: (values: T) => void
      show: (path: string, text: string) => void
      tidy?: (piece: MissingTranslation, text: string) => string
    },
  ) {
    if (!on || missing.length === 0) return save(values)
    translate.mutate(piecesOf(missing), {
      // One answer a piece, in order (the server holds it to that).
      onSuccess: (answers) => {
        const texts = answers.map((text, index) => tidy(missing[index]!, text))
        texts.forEach((text, index) => show(missing[index]!.path, text))
        save(withTranslations(values, missing, texts))
      },
      onError: () => save(values),
    })
  }

  // Busy too while the screen's other list translation runs (one at a time).
  return { on, busy: translating, fill }
}
