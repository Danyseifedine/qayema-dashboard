import { describe, expect, it } from 'vitest'
import {
  qrDesignSchema,
  qrFormSchema,
  toDesign,
  toFormValues,
  type QrDesign,
} from '@/features/qr/schemas/qr.schema'

const SIMPLE: QrDesign = {
  dot_style: 'square',
  dot_color: '#000000',
  dot_gradient: null,
  gradient_type: 'linear',
  corner_style: 'square',
  corner_color: '#000000',
  eye_style: 'square',
  eye_color: '#000000',
  background: '#FFFFFF',
  logo: false,
  logo_size: 'medium',
  card_theme: 'light',
  title: null,
  subtitle: null,
  cta: null,
  show_url: true,
}

function firstMessage(result: { error?: { issues: { message: string }[] } }) {
  return result.error?.issues[0]?.message
}

describe('qr schemas', () => {
  it('refuses a colour that is not six-digit hex', () => {
    expect(firstMessage(qrDesignSchema.safeParse({ ...SIMPLE, dot_color: 'black' }))).toBe(
      'Use a colour like #1F6FEB.',
    )
  })

  it('caps the card text', () => {
    const form = toFormValues(SIMPLE)
    expect(firstMessage(qrFormSchema.safeParse({ ...form, title: 'x'.repeat(61) }))).toBe(
      'Keep the title under 60 characters.',
    )
    expect(firstMessage(qrFormSchema.safeParse({ ...form, subtitle: 'x'.repeat(81) }))).toBe(
      'Keep the subtitle under 80 characters.',
    )
    expect(firstMessage(qrFormSchema.safeParse({ ...form, cta: 'x'.repeat(61) }))).toBe(
      'Keep this under 60 characters.',
    )
  })

  it('turns null card text into empty fields and back, trimming on the way out', () => {
    const form = toFormValues({ ...SIMPLE, title: 'Olive' })
    expect(form).toMatchObject({ title: 'Olive', subtitle: '', cta: '' })

    expect(
      toDesign({ ...form, title: '  Olive  ', subtitle: '   ', cta: 'Scan me' }),
    ).toMatchObject({ title: 'Olive', subtitle: null, cta: 'Scan me' })
  })
})
