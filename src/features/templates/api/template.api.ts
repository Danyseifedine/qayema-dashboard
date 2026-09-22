import { request } from '@/lib/api'
import { templateListSchema, type TemplateList } from '../schemas/template.schema'

export function fetchTemplates(signal?: AbortSignal): Promise<TemplateList> {
  return request(templateListSchema, { method: 'GET', url: '/api/templates', signal })
}

/**
 * Switches the restaurant to a design. Every active design is available on
 * every package, so this never fails on entitlement. Returns the whole list,
 * with `meta.current` updated.
 */
export function selectTemplate(templateId: number): Promise<TemplateList> {
  return request(templateListSchema, {
    method: 'POST',
    url: '/api/templates/select',
    data: { template_id: templateId },
  })
}
