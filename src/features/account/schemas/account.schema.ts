import { z } from 'zod'

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
    .min(2, 'Your name must be at least 2 characters.')
    .max(100, 'Your name may not be longer than 100 characters.')
    .regex(NO_CONTROL_CHARS, 'Your name contains characters that are not allowed.'),
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
        .min(MIN_PASSWORD, `Use at least ${MIN_PASSWORD} characters.`)
        .max(255, 'That password is too long.'),
      password_confirmation: z.string(),
    })
    .superRefine((values, ctx) => {
      if (hasPassword && values.current_password === '') {
        ctx.addIssue({
          code: 'custom',
          path: ['current_password'],
          message: 'Enter your current password.',
        })
      }

      if (values.password !== values.password_confirmation) {
        ctx.addIssue({
          code: 'custom',
          path: ['password_confirmation'],
          message: 'The two passwords do not match.',
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
