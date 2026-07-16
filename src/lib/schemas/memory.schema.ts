// src/lib/schemas/memory.schema.ts
import { z } from 'zod'

export const MemoryTypeSchema = z.enum(['photo', 'moment', 'milestone'])
export type MemoryType = z.infer<typeof MemoryTypeSchema>

export const MEMORY_MAX_PHOTOS = 10

// A single photo inside a memory post. `url` may be '' while the
// offline upload queue is still pending for that index.
export const MemoryPhotoSchema = z.object({
  url:   z.string(),
  thumb: z.string().optional(),
})
export type MemoryPhoto = z.infer<typeof MemoryPhotoSchema>

export const MemorySchema = z.object({
  id:          z.string().min(1).max(128),
  groupId:     z.string().min(1).max(128),
  type:        MemoryTypeSchema,
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  caption:     z.string().max(200).optional(),
  photos:      z.array(MemoryPhotoSchema).max(MEMORY_MAX_PHOTOS).optional(), // 1–10 photos per post
  photoUrl:    z.string().url().optional(),    // Legacy single-photo URL (pre-multi-photo docs)
  photoThumb:  z.string().url().optional(),    // Legacy thumbnail URL (Phase 4)
  uploadPending: z.boolean().optional(),
  takenBy:     z.string().min(1).optional(),   // uid of photographer
  location:    z.object({
    name:  z.string().max(100).optional(),
    lat:   z.number().optional(),
    lng:   z.number().optional(),
  }).optional(),
  reactions:   z.record(z.string(), z.string()).optional(),  // { uid: emoji }
  createdBy:   z.string().min(1),
  createdAt:   z.unknown(),
})

export const MemoryCreateSchema = MemorySchema.omit({ id: true })
export type MemoryInput = z.infer<typeof MemorySchema>
export type MemoryCreate = z.infer<typeof MemoryCreateSchema>

// ── Photo normalizers ─────────────────────────────────────────────
// New docs carry `photos[]`; legacy docs carry a single `photoUrl`/`photoThumb`.
// All readers go through these so both shapes render identically.

/** Returns every uploaded (non-pending) photo of a memory, legacy included. */
export function getMemoryPhotos(
  m: Pick<MemoryInput, 'photos' | 'photoUrl' | 'photoThumb'>
): MemoryPhoto[] {
  if (m.photos && m.photos.length > 0) {
    return m.photos.filter((p) => p.url !== '')
  }
  if (m.photoUrl) {
    return [{ url: m.photoUrl, thumb: m.photoThumb }]
  }
  return []
}

/** Full-res URL of the first photo — used as the post's cover. */
export function getMemoryCoverUrl(
  m: Pick<MemoryInput, 'photos' | 'photoUrl' | 'photoThumb'>
): string | undefined {
  return getMemoryPhotos(m)[0]?.url
}

/** Thumbnail-preferring URL of the first photo — used in grids and reels. */
export function getMemoryThumbUrl(
  m: Pick<MemoryInput, 'photos' | 'photoUrl' | 'photoThumb'>
): string | undefined {
  const first = getMemoryPhotos(m)[0]
  return first?.thumb || first?.url
}

/** True when the memory has at least one uploaded photo. */
export function memoryHasPhoto(
  m: Pick<MemoryInput, 'photos' | 'photoUrl' | 'photoThumb'>
): boolean {
  return getMemoryPhotos(m).length > 0
}
