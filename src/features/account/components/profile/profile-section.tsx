import { zodResolver } from '@hookform/resolvers/zod'
import { IconAt, IconMail, IconUserCircle } from '@tabler/icons-react'
import { useEffect, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Field, Form, FormActions, TextField } from '@/shared/components/forms'
import { Alert, Button, Input, SectionCard } from '@/shared/components/ui'
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
      <SectionCard
        icon={<IconUserCircle className="size-[18px]" stroke={1.8} />}
        picture="/assets/images/dashboard/more/profile.webp"
        bleed={false}
        title={t('profile.title')}
        description={t('profile.description')}
      >
        {formError ? <Alert variant="error">{formError}</Alert> : null}

        <TextField
          control={form.control}
          name="name"
          label={t('profile.nameLabel')}
          placeholder={t('profile.namePlaceholder')}
          required
          leadingIcon={<IconUserCircle />}
          maxLength={100}
          hint={t('profile.nameHint')}
        />

        {username ? (
          <SignInName
            label={t('profile.usernameLabel')}
            hint={t('profile.usernameHint')}
            icon={<IconAt aria-hidden />}
            value={username}
          />
        ) : null}
        {email ? (
          <SignInName
            label={t('profile.emailLabel')}
            hint={t('profile.emailHint')}
            icon={<IconMail aria-hidden />}
            value={email}
          />
        ) : null}

        <FormActions className="pt-0">
          <Button type="submit" loading={save.isPending} disabled={!form.formState.isDirty}>
            {t('profile.save')}
          </Button>
        </FormActions>
      </SectionCard>
    </Form>
  )
}

/** A name the owner signs in with, in a read-only field: it cannot be changed here. */
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
    <Field label={label} hint={hint}>
      {({ id, describedBy }) => (
        <Input
          id={id}
          aria-describedby={describedBy}
          readOnly
          value={value}
          leadingIcon={icon}
          dir="ltr"
          className="text-start text-[var(--muted)]"
        />
      )}
    </Field>
  )
}
