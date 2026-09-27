import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound } from 'lucide-react'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation('account')
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
        title={hasPassword ? t('password.changeTitle') : t('password.setTitle')}
        description={hasPassword ? t('password.changeDescription') : t('password.setDescription')}
      >
        {formError ? <Alert variant="error">{formError}</Alert> : null}

        {hasPassword ? (
          <TextField
            control={form.control}
            name="current_password"
            label={t('password.currentLabel')}
            required
            password
            autoComplete="current-password"
            leadingIcon={<KeyRound />}
          />
        ) : null}

        <TextField
          control={form.control}
          name="password"
          label={hasPassword ? t('password.newLabel') : t('password.passwordLabel')}
          required
          password
          autoComplete="new-password"
          hint={t('password.hint')}
        />

        <TextField
          control={form.control}
          name="password_confirmation"
          label={t('password.confirmLabel')}
          required
          password
          autoComplete="new-password"
        />

        <FormActions>
          <Button type="submit" loading={save.isPending}>
            {hasPassword ? t('password.changeSubmit') : t('password.setSubmit')}
          </Button>
        </FormActions>
      </FormSection>
    </Form>
  )
}
