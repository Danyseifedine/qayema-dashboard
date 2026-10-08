import { zodResolver } from '@hookform/resolvers/zod'
import { IconAt, IconMail, IconUserCircle } from '@tabler/icons-react'
import { useEffect, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Form, FormActions, FormSection, TextField } from '@/shared/components/forms'
import { Alert, Button } from '@/shared/components/ui'
import { useApiFormErrors } from '@/shared/hooks/use-api-form-errors'
import { useSaveProfile } from '@/features/account/hooks/use-account'
import {
  profileFormSchema,
  type ProfileFormValues,
} from '@/features/account/schemas/account.schema'

export type ProfileSectionProps = {
  name: string
  /** Null on an account made with a username. */
  email: string | null
  /** Null on an account made with Google. */
  username: string | null
}

/**
 * The owner's own name. What they sign in with (the username, the email, or
 * both) is their identity, so it is read-only.
 */
export function ProfileSection({ name, email, username }: ProfileSectionProps) {
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
          leadingIcon={<IconUserCircle />}
          maxLength={100}
          hint={t('profile.nameHint')}
        />

        {username ? (
          <SignInName
            label={t('profile.usernameLabel')}
            hint={t('profile.usernameHint')}
            icon={<IconAt aria-hidden className="size-4 shrink-0" />}
            value={username}
          />
        ) : null}
        {email ? (
          <SignInName
            label={t('profile.emailLabel')}
            hint={t('profile.emailHint')}
            icon={<IconMail aria-hidden className="size-4 shrink-0" />}
            value={email}
          />
        ) : null}

        <FormActions>
          <Button type="submit" loading={save.isPending} disabled={!form.formState.isDirty}>
            {t('profile.save')}
          </Button>
        </FormActions>
      </FormSection>
    </Form>
  )
}

/** A name the owner signs in with, shown as text: it cannot be changed here. */
function SignInName({
  label,
  hint,
  icon,
  value,
}: {
  label: string
  hint: string
  icon: ReactNode
  value: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium">{label}</span>
      <p className="force-ltr flex items-center gap-2 rounded-[var(--radius-control)] border-[0.5px] border-[var(--line)] bg-[var(--field)] px-3.5 py-2.5 text-[14px] text-[var(--muted)]">
        {icon}
        {value}
      </p>
      <p className="text-[12px] text-[var(--muted)]">{hint}</p>
    </div>
  )
}
