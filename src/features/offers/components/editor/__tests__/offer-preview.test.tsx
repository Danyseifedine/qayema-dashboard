import { render, screen } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { describe, expect, it } from 'vitest'
import { REMOVED_IMAGE } from '@/features/uploads'
import { OfferPreview } from '@/features/offers/components/editor/offer-preview'
import { useOfferLook, type OfferLook } from '@/features/offers/hooks/use-offer-look'
import { toOfferForm, type OfferFormValues } from '@/features/offers/schemas/offer.schema'

const look = (overrides: Partial<OfferLook> = {}): OfferLook => ({
  imageUrl: null,
  pictureSize: null,
  showText: true,
  title: 'Grill week',
  text: 'Every grill, a fifth off',
  ...overrides,
})

/** What useOfferLook reads from a form holding `values`. */
function LookOf({
  values,
  savedUrl = null,
}: {
  values: Partial<OfferFormValues>
  savedUrl?: string | null
}) {
  const form = useForm<OfferFormValues>({
    defaultValues: { ...toOfferForm(null, ['en']), ...values },
  })
  const found = useOfferLook(form.control, { savedUrl, locale: 'en' })
  return <output>{JSON.stringify(found)}</output>
}

function lookOf(values: Partial<OfferFormValues>, savedUrl: string | null = null): OfferLook {
  render(<LookOf values={values} savedUrl={savedUrl} />)
  return JSON.parse(screen.getByRole('status').textContent!) as OfferLook
}

describe('useOfferLook', () => {
  it('takes the saved picture until a new one is picked or it is removed', () => {
    expect(lookOf({}, 'https://cdn.test/saved.webp').imageUrl).toBe('https://cdn.test/saved.webp')
  })

  it('drops the picture once it is removed', () => {
    expect(lookOf({ image: REMOVED_IMAGE }, 'https://cdn.test/saved.webp').imageUrl).toBeNull()
  })

  it('shows a new pick at once', () => {
    const image = {
      key: '0b6f4a1e-1c2d-4e5f-8a9b-0c1d2e3f4a5b',
      previewUrl: 'blob:new',
      name: 'promo.jpg',
      optimizedSize: '40 KB',
      savedPercent: 50,
    }
    expect(lookOf({ image }).imageUrl).toBe('blob:new')
  })

  it('never carries the discount: the menu shows it on the dishes', () => {
    expect(lookOf({ discount_type: 'percent', discount_value: '20' })).not.toHaveProperty('badge')
  })

  it('reads the title and text in the language asked', () => {
    expect(lookOf({ title: { en: 'Brunch' }, description: { en: 'Eggs' } })).toMatchObject({
      title: 'Brunch',
      text: 'Eggs',
      showText: true,
    })
  })
})

describe('OfferPreview', () => {
  it('draws the words on the brand gold without a picture', () => {
    const { container } = render(<OfferPreview look={look()} shape="rectangle" />)
    expect(container.firstElementChild).toHaveClass('aspect-[2/1]', 'from-gold')
    expect(screen.getByText('Grill week')).toBeInTheDocument()
    expect(screen.getByText('Every grill, a fifth off')).toBeInTheDocument()
  })

  it('lays the words over the picture', () => {
    const { container } = render(
      <OfferPreview look={look({ imageUrl: 'https://cdn.test/o.webp' })} shape="tall" />,
    )
    expect(container.firstElementChild).toHaveClass('aspect-[3/4]')
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://cdn.test/o.webp')
    expect(screen.getByText('Grill week').parentElement).toHaveClass('text-white')
  })

  it('shows a picture far from its shape whole, on a blurred copy of itself', () => {
    const { container } = render(
      <OfferPreview
        look={look({
          imageUrl: 'https://cdn.test/o.webp',
          pictureSize: { width: 600, height: 1200 },
        })}
        shape="rectangle"
      />,
    )
    const [backdrop, picture] = container.querySelectorAll('img')
    expect(backdrop).toHaveClass('blur-xl')
    expect(picture).toHaveClass('object-contain')
  })

  it('crops a picture close to its shape to fill it', () => {
    const { container } = render(
      <OfferPreview
        look={look({
          imageUrl: 'https://cdn.test/o.webp',
          pictureSize: { width: 1600, height: 900 },
        })}
        shape="rectangle"
      />,
    )
    expect(container.querySelectorAll('img')).toHaveLength(1)
    expect(container.querySelector('img')).toHaveClass('object-cover')
  })

  it('keeps a small one to its title', () => {
    render(<OfferPreview look={look({ title: '' })} shape="square" size="mini" />)
    expect(screen.getByText('Untitled offer')).toBeInTheDocument()
    expect(screen.queryByText('Every grill, a fifth off')).toBeNull()
  })

  it('shows a picture alone as only its picture', () => {
    const { container } = render(
      <OfferPreview
        look={look({ showText: false, imageUrl: 'https://cdn.test/p.webp' })}
        shape="square"
      />,
    )
    expect(container.querySelector('img')).not.toBeNull()
    expect(screen.queryByText('Grill week')).toBeNull()
  })

  it('holds a place for a picture alone still waiting for its picture', () => {
    const { container } = render(<OfferPreview look={look({ showText: false })} shape="square" />)
    expect(container.firstElementChild).toHaveClass('inset-tile')
    expect(container.querySelector('svg')).not.toBeNull()
  })
})
