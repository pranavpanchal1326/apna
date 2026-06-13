// src/lib/schemas/memory.schema.ts
import { z } from 'zod'

export const MemoryTypeSchema = z.enum(['photo', 'moment', 'milestone'])
export type MemoryType = z.infer<typeof MemoryTypeSchema>

export const MemorySchema = z.object({
  id:          z.string().min(1).max(128),
  groupId:     z.string().min(1).max(128),
  type:        MemoryTypeSchema,
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  caption:     z.string().max(200).optional(),
  photoUrl:    z.string().url().optional(),    // Firebase Storage URL
  photoThumb:  z.string().url().optional(),    // Thumbnail URL (Phase 4)
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
