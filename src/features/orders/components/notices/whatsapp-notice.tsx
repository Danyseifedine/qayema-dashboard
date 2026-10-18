import { IconBrandWhatsapp, IconSend } from '@tabler/icons-react'
import { Trans, useTranslation } from 'react-i18next'
import { GoldNotice } from '@/shared/components/feedback'

export type WhatsAppNoticeProps = {
  /** `tables.whatsappTitle` or `whatsapp.title`: either page's own heading. */
  titleKey: 'tables.whatsappTitle' | 'whatsapp.title'
  description: string
  /** Opens the Features page, where orders can come here instead. */
  onOpenFeatures: () => void
}

/** Where new orders go while they go to WhatsApp: the same notice as QR Studio switched off. */
export function WhatsAppNotice({ titleKey, description, onOpenFeatures }: WhatsAppNoticeProps) {
  const { t } = useTranslation('orders')

  return (
    <GoldNotice
      icon={IconBrandWhatsapp}
      badge={IconSend}
      title={
        <Trans t={t} i18nKey={titleKey} components={{ gold: <span className="text-accent" /> }} />
      }
      description={description}
      action={t('whatsapp.action')}
      onAction={onOpenFeatures}
      note={t('whatsapp.mode')}
    />
  )
}
