import { z } from 'zod'
import { t } from '@/lib/i18n'

/**
 * Mirrors ../qayema/app/Http/Requests/UpdateAccountRequest.php and
 * UpdatePasswordRequest.php. The server stays the authority; these exist so a
 * problem is caught before a round trip and reads the same on both sides.
 */

/** Rejects interior control characters, as the server's `/u` regex does. */
// oxlint-disable-next-line no-control-regex
const NO_CONTROL_CHARS = /^[^\u0000-\u001F\u007F]+$/

export const profileFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { error: () => t('account:validation.nameTooShort') })
    .max(100, { error: () => t('account:validation.nameTooLong') })
    .regex(NO_CONTROL_CHARS, { error: () => t('account:validation.nameInvalidChars') }),
})

/** Laravel's `Password::defaults()` is eight characters. */
const MIN_PASSWORD = 8

/**
 * A Google-only account is *setting* a first password, so there is no current
 * one to prove. Everyone else has to type theirs.
 */
export function passwordFormSchema(hasPassword: boolean) {
  return z
    .object({
      current_password: z.string(),
      password: z
        .string()
        .min(MIN_PASSWORD, {
          error: () => t('account:validation.passwordTooShort', { count: MIN_PASSWORD }),
        })
        .max(255, { error: () => t('account:validation.passwordTooLong') }),
      password_confirmation: z.string(),
    })
    .superRefine((values, ctx) => {
      if (hasPassword && values.current_password === '') {
        ctx.addIssue({
          code: 'custom',
          path: ['current_password'],
          message: t('account:validation.currentRequired'),
        })
      }

      if (values.password !== values.password_confirmation) {
        ctx.addIssue({
          code: 'custom',
          path: ['password_confirmation'],
          message: t('account:validation.mismatch'),
        })
      }
    })
}

export const passwordResponseSchema = z.object({
  message: z.string(),
  has_password: z.boolean(),
})

export type ProfileFormValues = z.infer<typeof profileFormSchema>
export type PasswordFormValues = z.infer<ReturnType<typeof passwordFormSchema>>
