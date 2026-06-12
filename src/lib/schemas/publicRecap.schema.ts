// src/lib/schemas/publicRecap.schema.ts
// Sanitized public trip recap — independent from live mutable trip state.

import { z } from 'zod'

export const RECAP_VISIBILITY = ['private', 'unlisted', 'public'] as const
export type RecapVisibility = (typeof RECAP_VISIBILITY)[number]

export const RECAP_TEMPLATES = ['default', 'weekend', 'year_in_review'] as const
export type RecapTemplate = (typeof RECAP_TEMPLATES)[number]

export const PublicRecapSchema = z.object({
  id: z.string().min(4).max(64),
  groupId: z.string().min(1).max(128),
  tripName: z.string().min(1).max(60),
  destination: z.string().max(80).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateRangeLabel: z.string().max(80),
  createdAt: z.unknown(),
  createdBy: z.string().min(1).max(128),
  updatedAt: z.unknown().optional(),
  coverPhotoUrl: z.string().url().optional(),
  topPhotos: z.array(z.string().url()).max(6),
  coverEmoji: z.string().max(8).optional(),
  totalSpend: z.number().positive().optional(),
  currency: z.string().length(3).default('INR'),
  memberCount: z.number().int().min(1),
  memoriesCount: z.number().int().min(0),
  placesCount: z.number().int().min(0),
  daysCount: z.number().int().min(1),
  shareSlug: z.string().min(4).max(64),
  isPublic: z.boolean(),
  visibility: z.enum(RECAP_VISIBILITY),
  template: z.enum(RECAP_TEMPLATES).default('default'),
  tagline: z.string().max(120).optional(),
  includeSpend: z.boolean().default(false),
  version: z.number().int().min(1).default(1),
})

export type PublicRecap = z.infer<typeof PublicRecapSchema>

export interface RecapGenerationOptions {
  includeSpend?: boolean
  visibility?: RecapVisibility
  template?: RecapTemplate
}

export interface RecapGenerationResult {
  ok: boolean
  recap?: PublicRecap
  publicUrl?: string
  reason?: string
}
