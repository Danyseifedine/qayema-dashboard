import { request } from '@/lib/api'
import { templateListSchema, type TemplateList } from '../schemas/template.schema'

export function fetchTemplates(signal?: AbortSignal): Promise<TemplateList> {
  return request(templateListSchema, { method: 'GET', url: '/api/templates', signal })
}

/**
 * Switches the restaurant to a design it already owns.
 *
 * Kept apart from `unlock` on purpose: choosing a design must never spend
 * coins by accident. Returns the whole list, with `meta.current` updated.
 */
export function selectTemplate(templateId: number): Promise<TemplateList> {
  return request(templateListSchema, {
    method: 'POST',
    url: '/api/templates/select',
    data: { template_id: templateId },
  })
}

/**
 * Buys a paid design with coins. Ownership is permanent, so switching back and
 * forth afterwards is free. A short balance comes back as a 402 carrying the
 * shortfall.
 */
export function unlockTemplate(templateId: number): Promise<TemplateList> {
  return request(templateListSchema, {
    method: 'POST',
    url: '/api/templates/unlock',
    data: { template_id: templateId },
  })
}
