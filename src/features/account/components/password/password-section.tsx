import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound } from 'lucide-react'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { Form, FormActions, FormSection, TextField } from '@/shared/components/forms'
import { Alert, Button } from '@/shared/components/ui'
import { useApiFormErrors } from '@/shared/hooks/use-api-form-errors'
import { useSavePassword } from '../../hooks/use-account'
import { passwordFormSchema, type PasswordFormValues } from '../../schemas/account.schema'

export type PasswordSectionProps = {
  /** False for a Google-only account, which is setting its first password. */
  hasPassword: boolean
}

const EMPTY: PasswordFormValues = {
  current_password: '',
  password: '',
  password_confirmation: '',
}

export function PasswordSection({ hasPassword }: PasswordSectionProps) {
  const save = useSavePassword(hasPassword)

  const schema = useMemo(() => passwordFormSchema(hasPassword), [hasPassword])

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: EMPTY,
  })

  const { formError, applyApiError, clearFormError } = useApiFormErrors(form.setError)

  const onSubmit = form.handleSubmit((values) => {
    clearFormError()
    save.mutate(
      {
        ...(hasPassword ? { current_password: values.current_password } : {}),
        password: values.password,
        password_confirmation: values.password_confirmation,
      },
      {
        // Never leave a typed password sitting in the form.
        onSuccess: () => form.reset(EMPTY),
        onError: (error) => applyApiError(error),
      },
    )
  })

  return (
    <Form onSubmit={onSubmit}>
      <FormSection
        title={hasPassword ? 'Password' : 'Set a password'}
        description={
          hasPassword
            ? 'Changing this signs out every other browser you stayed signed in on.'
            : 'You signed up with Google. Adding a password gives you a second way in.'
        }
      >
        {formError ? <Alert variant="error">{formError}</Alert> : null}

        {hasPassword ? (
          <TextField
            control={form.control}
            name="current_password"
            label="Current password"
            required
            password
            autoComplete="current-password"
            leadingIcon={<KeyRound />}
          />
        ) : null}

        <TextField
          control={form.control}
          name="password"
          label={hasPassword ? 'New password' : 'Password'}
          required
          password
          autoComplete="new-password"
          hint="At least 8 characters."
        />

        <TextField
          control={form.control}
          name="password_confirmation"
          label="Confirm password"
          required
          password
          autoComplete="new-password"
        />

        <FormActions>
          <Button type="submit" loading={save.isPending}>
            {hasPassword ? 'Change password' : 'Set password'}
          </Button>
        </FormActions>
      </FormSection>
    </Form>
  )
}
