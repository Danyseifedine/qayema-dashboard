import { describe, expect, it } from 'vitest'
import { socialLinkFormSchema } from '@/features/social-links/schemas/social-link.schema'

function messages(url: string): string[] {
  const result = socialLinkFormSchema.safeParse({ platform: 'instagram', url })
  return result.success ? [] : result.error.issues.map((issue) => issue.message)
}

describe('socialLinkFormSchema', () => {
  it('accepts a web link', () => {
    expect(messages('https://instagram.com/beit')).toEqual([])
    expect(messages('http://instagram.com/beit')).toEqual([])
  })

  it('refuses something that is not a link', () => {
    expect(messages('instagram')).toContain('Enter the full link, starting with https://')
  })

  it('refuses a link over 500 characters', () => {
    expect(messages(`https://instagram.com/${'x'.repeat(500)}`)).toContain('That link is too long.')
  })

  it('refuses a scheme that is not the web', () => {
    expect(messages('ftp://instagram.com/beit')).toContain(
      'A link must start with http:// or https://',
    )
  })

  it('refuses a link with a space, as the server does', () => {
    expect(messages('https://instagram.com/beit kitchen')).toContain(
      'Enter the full link, starting with https://',
    )
  })
})
