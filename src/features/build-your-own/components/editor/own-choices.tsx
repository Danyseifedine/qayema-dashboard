import { IconPlus } from '@tabler/icons-react'
import { useState } from 'react'
import { get, useFieldArray, useFormState, type Control } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { ChoiceRow, SortableCard, SortableList, languagesWithErrors } from '@/features/menu'
import { LocaleTabs } from '@/shared/components/forms'
import { Button, HelperText } from '@/shared/components/ui'
import { mainLanguageOf } from '@/shared/constants/menu-languages'
import {
  BUILD_LIMITS,
  blankChoice,
  type BuildFormInput,
} from '@/features/build-your-own/schemas/build.schema'

export type OwnChoicesProps = {
  control: Control<BuildFormInput>
  languages: readonly string[]
  currency: string
}

/**
 * The owner's own list (Vanilla, Chocolate): each choice a name and its
 * price, one language at a time behind one set of tabs, dragged into the
 * order guests see. 2 to 30.
 */
export function OwnChoices({ control, languages, currency }: OwnChoicesProps) {
  const { t } = useTranslation('build-your-own')
  const [language, setLanguage] = useState(() => mainLanguageOf(languages))
  const choices = useFieldArray({ control, name: 'choices' })
  const { errors } = useFormState({ control, name: 'choices' })
  const listError = get(errors, 'choices') as
    { message?: string; root?: { message?: string } } | undefined
  const message = listError?.message ?? listError?.root?.message

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <HelperText>{t('choices.listHint', { max: BUILD_LIMITS.choices })}</HelperText>
        {languages.length > 1 ? (
          <LocaleTabs
            languages={languages}
            value={language}
            onChange={setLanguage}
            incomplete={languagesWithErrors(errors.choices, languages)}
          />
        ) : null}
      </div>

      <SortableList
        items={choices.fields}
        layout="list"
        onReorder={(_, from, to) => choices.move(from, to)}
      >
        <div className="flex flex-col gap-1.5">
          {choices.fields.map((field, index) => (
            <SortableCard key={field.id} id={field.id}>
              {({ handle }) => (
                <ChoiceRow
                  control={control}
                  path={`choices.${index}`}
                  languages={languages}
                  language={language}
                  currency={currency}
                  handle={handle}
                  nameLabel={t('choices.rowName', { number: index + 1 })}
                  priceLabel={t('choices.rowPrice', { number: index + 1 })}
                  full
                  removeLabel={t('choices.remove', { number: index + 1 })}
                  placeholder={t('choices.rowPlaceholder')}
                  onRemove={() => choices.remove(index)}
                />
              )}
            </SortableCard>
          ))}
        </div>
      </SortableList>

      {message ? <HelperText tone="error">{message}</HelperText> : null}

      {choices.fields.length < BUILD_LIMITS.choices ? (
        <div>
          <Button
            variant="ghost"
            size="sm"
            leadingIcon={<IconPlus aria-hidden className="size-4" />}
            onClick={() => choices.append(blankChoice(languages))}
          >
            {t('choices.add')}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
