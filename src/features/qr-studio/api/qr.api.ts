import { request } from '@/lib/api'
import { qrResponseSchema, type Qr, type QrDesign } from '../schemas/qr.schema'

export async function fetchQr(signal?: AbortSignal): Promise<Qr> {
  const { data } = await request(qrResponseSchema, { method: 'GET', url: '/api/qr', signal })
  return data
}

/**
 * Saves how the code looks. The link it encodes never changes, so a code
 * already printed on the tables keeps working whatever is saved here.
 */
export async function saveQr(design: QrDesign): Promise<Qr> {
  const { data } = await request(qrResponseSchema, { method: 'PUT', url: '/api/qr', data: design })
  return data
}
