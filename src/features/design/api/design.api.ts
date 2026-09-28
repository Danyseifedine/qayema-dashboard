import { request } from '@/lib/api'
import { designListSchema, type DesignList } from '@/features/design/schemas/design.schema'

export function fetchDesigns(signal?: AbortSignal): Promise<DesignList> {
  return request(designListSchema, { method: 'GET', url: '/api/templates', signal })
}

/**
 * Switches the restaurant to a design. A premium one the package does not
 * include is refused (403); the page never offers it. Returns the whole list,
 * with `meta.current` updated.
 */
export function selectDesign(templateId: number): Promise<DesignList> {
  return request(designListSchema, {
    method: 'POST',
    url: '/api/templates/select',
    data: { template_id: templateId },
  })
}
