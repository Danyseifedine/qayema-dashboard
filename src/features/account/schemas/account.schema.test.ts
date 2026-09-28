import { describe, expect, it } from 'vitest'
import { passwordFormSchema, profileFormSchema } from '@/features/account/schemas/account.schema'

function messages(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.success ? [] : (result.error?.issues.map((issue) => issue.message) ?? [])
}

describe('profileFormSchema', () => {
  it('accepts an ordinary name and trims it', () => {
    expect(profileFormSchema.parse({ name: '  Dany  ' })).toEqual({ name: 'Dany' })
  })

  it('refuses a name that is too short', () => {
    expect(messages(profileFormSchema.safeParse({ name: ' D ' }))).toContain(
      'Your name must be at least 2 characters.',
    )
  })

  it('refuses a name that is too long', () => {
    expect(messages(profileFormSchema.safeParse({ name: 'x'.repeat(101) }))).toContain(
      'Your name may not be longer than 100 characters.',
    )
  })

  it('refuses control characters inside the name', () => {
    expect(messages(profileFormSchema.safeParse({ name: 'Da\u0007ny' }))).toContain(
      'Your name contains characters that are not allowed.',
    )
  })
})

describe('passwordFormSchema', () => {
  const valid = {
    current_password: 'old-password',
    password: 'a-long-new-one',
    password_confirmation: 'a-long-new-one',
  }

  it('accepts a matching pair with the current password', () => {
    expect(passwordFormSchema(true).safeParse(valid).success).toBe(true)
  })

  it('asks for the current password when the account has one', () => {
    expect(
      messages(passwordFormSchema(true).safeParse({ ...valid, current_password: '' })),
    ).toEqual(['Enter your current password.'])
  })

  it('does not ask for a current password on a Google-only account', () => {
    expect(passwordFormSchema(false).safeParse({ ...valid, current_password: '' }).success).toBe(
      true,
    )
  })

  it('refuses a password under eight characters', () => {
    const result = passwordFormSchema(true).safeParse({
      ...valid,
      password: 'short',
      password_confirmation: 'short',
    })
    expect(messages(result)).toContain('Use at least 8 characters.')
  })

  it('refuses a password over 255 characters', () => {
    const long = 'x'.repeat(256)
    const result = passwordFormSchema(true).safeParse({
      ...valid,
      password: long,
      password_confirmation: long,
    })
    expect(messages(result)).toContain('That password is too long.')
  })

  it('refuses two passwords that differ', () => {
    const result = passwordFormSchema(false).safeParse({ ...valid, password_confirmation: 'nope' })
    expect(messages(result)).toEqual(['The two passwords do not match.'])
  })
})
