import { IconSparkles } from '@tabler/icons-react'
import type { ReactNode } from 'react'
import { useController, type FieldPath, type UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { Category } from '@/features/menu'
import { BuildPicture } from '@/features/build-your-own/components/editor/build-picture'
import { OptionCards } from '@/features/build-your-own/components/editor/option-cards'
import {
  BUILD_KINDS,
  kindDefaults,
  suggestedCategory,
  type BuildFormInput,
  type BuildFormValues,
  type BuildKind,
} from '@/features/build-your-own/schemas/build.schema'

const PICTURES: Record<BuildKind, ReactNode> = {
  pizza: <BuildPicture shape="split" count={2} />,
  pieces: <BuildPicture shape="pieces" count={3} />,
  other: <IconSparkles className="size-12 text-gold" stroke={1.4} />,
}

export type KindStepProps = {
  form: UseFormReturn<BuildFormInput, unknown, BuildFormValues>
  languages: readonly string[]
  categories: readonly Category[]
}

/**
 * The first step: what guests build, on three cards with a picture each. A
 * card sets up the rest of the editor the way that kind of build usually
 * goes; the owner changes any of it later.
 */
export function KindStep({ form, languages, categories }: KindStepProps) {
  const { t } = useTranslation('build-your-own')
  const { field, fieldState } = useController({ control: form.control, name: 'kind' })

  // A radio already picked sends no change, so a pick is always a new card.
  const pick = (kind: BuildKind) => {
    field.onChange(kind)
    const changes = kindDefaults(kind, form.getValues(), languages, suggestedCategory(categories))
    for (const [key, value] of Object.entries(changes)) {
      form.setValue(key as FieldPath<BuildFormInput>, value as never, { shouldDirty: true })
    }
  }

  return (
    <OptionCards
      name={field.name}
      legend={t('kinds.label')}
      value={field.value}
      onChange={pick}
      error={fieldState.error?.message}
      inputRef={field.ref}
      className="sm:grid-cols-3"
      options={BUILD_KINDS.map((kind) => ({
        value: kind,
        label: t(`kinds.${kind}.name`),
        hint: t(`kinds.${kind}.hint`),
        picture: PICTURES[kind],
      }))}
    />
  )
}
