import { zodResolver } from '@hookform/resolvers/zod'
import { Mail, UserRound } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Form, FormActions, FormSection, TextField } from '@/shared/components/forms'
import { Alert, Button } from '@/shared/components/ui'
import { useApiFormErrors } from '@/shared/hooks/use-api-form-errors'
import { useSaveProfile } from '../../hooks/use-account'
import { profileFormSchema, type ProfileFormValues } from '../../schemas/account.schema'

export type ProfileSectionProps = {
  name: string
  email: string
}

/** The owner's own name. The email is their identity, so it is read-only. */
export function ProfileSection({ name, email }: ProfileSectionProps) {
  const { t } = useTranslation('account')
  const save = useSaveProfile()

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    mode: 'onBlur',
    defaultValues: { name },
  })

  const { formError, applyApiError, clearFormError } = useApiFormErrors(form.setError)

  // Keep the field in step when the session refetches under it.
  useEffect(() => {
    form.reset({ name })
  }, [name, form])

  const onSubmit = form.handleSubmit((values) => {
    clearFormError()
    save.mutate(values.name, { onError: (error) => applyApiError(error) })
  })

  return (
    <Form onSubmit={onSubmit}>
      <FormSection title={t('profile.title')} description={t('profile.description')}>
        {formError ? <Alert variant="error">{formError}</Alert> : null}

        <TextField
          control={form.control}
          name="name"
          label={t('profile.nameLabel')}
          required
          leadingIcon={<UserRound />}
          maxLength={100}
          hint={t('profile.nameHint')}
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium">{t('profile.emailLabel')}</span>
          <p className="force-ltr flex items-center gap-2 rounded-[var(--radius-control)] border-[0.5px] border-[var(--line)] bg-[var(--field)] px-3.5 py-2.5 text-[14px] text-[var(--muted)]">
            <Mail aria-hidden className="size-4 shrink-0" />
            {email}
          </p>
          <p className="text-[12px] text-[var(--muted)]">{t('profile.emailHint')}</p>
        </div>

        <FormActions>
          <Button type="submit" loading={save.isPending} disabled={!form.formState.isDirty}>
            {t('profile.save')}
          </Button>
        </FormActions>
      </FormSection>
    </Form>
  )
}
