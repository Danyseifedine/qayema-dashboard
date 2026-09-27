import { request } from '@/lib/api'
import {
  templateListSchema,
  templateSettingsResponseSchema,
  type TemplateList,
  type TemplateSettings,
} from '../schemas/template.schema'

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

/**
 * Saves some of the active design's settings. Only the keys sent change; the
 * answer is every setting the menu is now drawn with.
 */
export function saveTemplateSettings(settings: TemplateSettings): Promise<TemplateSettings> {
  return request(templateSettingsResponseSchema, {
    method: 'PUT',
    url: '/api/template-settings',
    data: { settings },
  }).then((response) => response.data.settings)
}
