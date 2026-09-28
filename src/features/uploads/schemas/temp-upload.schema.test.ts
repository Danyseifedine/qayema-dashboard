import { describe, expect, it } from 'vitest'
import {
  REMOVED_IMAGE,
  UPLOAD_CONTEXTS,
  imageChanges,
  imageFieldSchema,
  tempUploadSchema,
  uploadedImageSchema,
  type UploadedImage,
} from '@/features/uploads/schemas/temp-upload.schema'

const picked: UploadedImage = {
  key: '11111111-2222-4333-8444-555555555555',
  previewUrl: 'blob:preview',
  name: 'dish.png',
  optimizedSize: '42.3 KB',
  savedPercent: 97,
}

describe('temp upload schemas', () => {
  it('lists exactly the contexts the API accepts', () => {
    expect(UPLOAD_CONTEXTS).toEqual(['logo', 'cover_image', 'dish', 'generic'])
  })

  it('parses the flat upload response and refuses a key that is not a UUID', () => {
    const body = {
      key: picked.key,
      optimized_size: '42.3 KB',
      saved_percent: 97,
    }
    expect(tempUploadSchema.parse(body)).toEqual(body)
    expect(tempUploadSchema.safeParse({ ...body, key: 'nope' }).success).toBe(false)
  })

  it('explains an unreadable key in words', () => {
    const result = uploadedImageSchema.safeParse({ ...picked, key: 'NOT-A-KEY' })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]).toMatchObject({
      path: ['key'],
      message: 'That upload could not be read. Please try again.',
    })
  })

  it('holds a new upload, the removed marker, or nothing', () => {
    expect(imageFieldSchema.parse(picked)).toEqual(picked)
    expect(imageFieldSchema.parse(REMOVED_IMAGE)).toBe('removed')
    expect(imageFieldSchema.parse(null)).toBeNull()
    expect(imageFieldSchema.safeParse('something else').success).toBe(false)
  })
})

describe('imageChanges', () => {
  it('sends only the key of a new upload', () => {
    expect(imageChanges(picked, 'image_key', 'delete_image')).toEqual({ image_key: picked.key })
  })

  it('sends the delete flag when the saved image was removed', () => {
    expect(imageChanges(REMOVED_IMAGE, 'logo_key', 'delete_logo')).toEqual({ delete_logo: true })
  })

  it('sends nothing for a removal when the field has no delete flag', () => {
    expect(imageChanges(REMOVED_IMAGE, 'logo_key')).toEqual({})
  })

  it('sends nothing when the image is unchanged', () => {
    expect(imageChanges(null, 'image_key', 'delete_image')).toEqual({})
  })
})
