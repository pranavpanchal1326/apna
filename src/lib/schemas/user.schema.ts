// src/lib/schemas/user.schema.ts
import { z } from 'zod'

export const AVATAR_COLORS_ARRAY = [
  '#4ECDC4', '#FF6B6B', '#FFD166', '#A8E6CF',
  '#FF8B94', '#7EC8E3', '#B5B5FF', '#FECA57',
] as const

export const UserSchema = z.object({
  uid:         z.string().min(1).max(128),
  phone:       z.string().regex(/^\+91[6-9]\d{9}$/, 'Invalid Indian phone number'),
  phoneHash:   z.string().length(16).optional(),
  name:        z.string().min(1).max(40),
  avatarColor: z.enum(AVATAR_COLORS_ARRAY),
  createdAt:   z.unknown(),   // Firestore Timestamp — validated as present, not typed
  groups:      z.array(z.string().max(128)).max(20).default([]),
  fcmToken:    z.string().max(512).optional(),   // Phase 5 — push notifications
  photoUrl:    z.string().url().optional(),       // Phase 4 — profile photo
})

// Partial for updates — all fields optional except uid
export const UserUpdateSchema = UserSchema
  .partial()
  .required({ uid: true })
  .omit({ phone: true, createdAt: true })  // Immutable

export type UserInput = z.infer<typeof UserSchema>
export type UserUpdate = z.infer<typeof UserUpdateSchema>
