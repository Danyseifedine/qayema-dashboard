import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { ComboboxField, Form, FormActions, UrlField } from '@/shared/components/forms'
import { Alert, Button } from '@/shared/components/ui'
import { useApiFormErrors } from '@/shared/hooks/use-api-form-errors'
import { cn } from '@/shared/utils/dom/cn'
import { useSaveSocialLink } from '../../hooks/use-social-links'
import {
  PLATFORM_LABELS,
  SOCIAL_PLATFORMS,
  socialLinkFormSchema,
  type SocialLink,
  type SocialLinkFormValues,
  type SocialPlatform,
} from '../../schemas/social-link.schema'

export type SocialLinkDialogProps = {
  open: boolean
  /** Null adds a new link. */
  link: SocialLink | null
  /** Platforms already in use, so the same one cannot be added twice. */
  taken: SocialPlatform[]
  onClose: () => void
}

/** Where each platform's address usually starts, so the field is not a blank page. */
const PLACEHOLDERS: Record<SocialPlatform, string> = {
  instagram: 'https://instagram.com/your-restaurant',
  x: 'https://x.com/your-restaurant',
  facebook: 'https://facebook.com/your-restaurant',
  tiktok: 'https://tiktok.com/@your-restaurant',
}

export function SocialLinkDialog({ open, link, taken, onClose }: SocialLinkDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const save = useSaveSocialLink(link?.id ?? null)

  // The platform being edited stays on the list; every other one already in
  // use comes off it, because the server allows one link per platform.
  const available = SOCIAL_PLATFORMS.filter(
    (platform) => platform === link?.platform || !taken.includes(platform),
  )

  const form = useForm<SocialLinkFormValues>({
    resolver: zodResolver(socialLinkFormSchema),
    defaultValues: { platform: available[0] ?? 'instagram', url: '' },
  })

  const { formError, applyApiError, clearFormError } = useApiFormErrors(form.setError)

  // Which platforms are free changes identity on every parent render, so the
  // reset below reads it through a ref. Depending on it directly would re-run
  // the reset mid-typing and wipe the field.
  const takenRef = useRef(taken)
  useEffect(() => {
    takenRef.current = taken
  })

  // Reset whenever the dialog opens, so a previous edit never leaks in.
  useEffect(() => {
    if (!open) return
    clearFormError()

    const free = SOCIAL_PLATFORMS.filter(
      (platform) => platform === link?.platform || !takenRef.current.includes(platform),
    )

    form.reset(
      link
        ? { platform: link.platform, url: link.url }
        : { platform: free[0] ?? 'instagram', url: '' },
    )
  }, [open, link, form, clearFormError])

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const platform = form.watch('platform')

  const onSubmit = form.handleSubmit((values) => {
    clearFormError()
    save.mutate(values, {
      onSuccess: onClose,
      onError: (error) => applyApiError(error),
    })
  })

  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault()
        if (!save.isPending) onClose()
      }}
      onClick={(event) => {
        if (event.target === ref.current && !save.isPending) onClose()
      }}
      className={cn(
        'm-auto w-[min(92vw,460px)] rounded-[16px] border-[0.5px] border-[var(--line)] p-0',
        'bg-[var(--surface)] text-[var(--text)] shadow-pop',
      )}
    >
      <Form onSubmit={onSubmit} className="gap-0">
        <div className="p-5 pb-0">
          <h2 className="font-display text-[19px] leading-tight">
            {link ? 'Edit link' : 'Add a social link'}
          </h2>
          <p className="mt-1.5 text-[13px] leading-snug text-[var(--muted)]">
            Guests see these as icons at the bottom of your menu.
          </p>

          {formError ? (
            <Alert variant="error" className="mt-3">
              {formError}
            </Alert>
          ) : null}

          <ComboboxField
            control={form.control}
            name="platform"
            label="Platform"
            required
            searchable={false}
            options={available.map((value) => ({ value, label: PLATFORM_LABELS[value] }))}
            placeholder="Choose a platform"
          />

          <UrlField
            control={form.control}
            name="url"
            label="Link"
            required
            placeholder={PLACEHOLDERS[platform] ?? 'https://'}
            hint="Paste the full address, including https://"
          />
        </div>

        <FormActions className="mt-4 border-t-[0.5px] border-[var(--line)] p-3.5">
          <Button variant="ghost" onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending}>
            {link ? 'Save link' : 'Add link'}
          </Button>
        </FormActions>
      </Form>
    </dialog>
  )
}
