import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FontOptions } from '@/features/colors-fonts/components/fonts/font-options'
import type { FontScript } from '@/features/colors-fonts/schemas/colors-fonts.schema'
import { FormSection } from '@/shared/components/forms'
import { languageName } from '@/shared/constants/menu-languages'

export type FontsCardProps = {
  fonts: FontScript[]
  onPick: (script: string, family: string) => void
}

/**
 * One stylesheet for every font on the page, cut down with `text=` to the
 * letters the samples use, so showing eight fonts costs a few kilobytes.
 */
function samplesHref(fonts: FontScript[]): string | null {
  const families = [...new Set(fonts.flatMap((row) => row.options.map((option) => option.family)))]
  if (families.length === 0) return null

  const letters = [...new Set(fonts.map((row) => row.sample).join(''))].join('')
  const query = families.map((family) => `family=${family.replace(/ /g, '+')}`).join('&')

  return `https://fonts.googleapis.com/css2?${query}&text=${encodeURIComponent(letters)}&display=swap`
}

function useStylesheet(href: string | null) {
  useEffect(() => {
    if (href === null) return
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    document.head.appendChild(link)
    return () => link.remove()
  }, [href])
}

/**
 * A font per writing system the menu uses. Languages that share letters share
 * a font, so English and Spanish are one picker and Arabic is another.
 */
export function FontsCard({ fonts, onPick }: FontsCardProps) {
  const { t } = useTranslation('colors-fonts')
  useStylesheet(samplesHref(fonts))

  return (
    <FormSection title={t('fonts.title')} description={t('fonts.description')}>
      <div className="flex flex-col gap-4">
        {fonts.map((script) => (
          <FontOptions
            key={script.script}
            legend={script.languages.map(languageName).join(' · ')}
            script={script}
            onChange={(family) => onPick(script.script, family)}
          />
        ))}
      </div>
    </FormSection>
  )
}
