// src/lib/schemas/itinerary.schema.ts
import { z } from 'zod'

export const ItineraryItemTypeSchema = z.enum([
  'flight', 'hotel', 'activity', 'restaurant',
  'transport', 'free_time', 'note'
])
export type ItineraryItemType = z.infer<typeof ItineraryItemTypeSchema>

export const ItineraryItemSchema = z.object({
  id:          z.string().min(1).max(128),
  groupId:     z.string().min(1).max(128),
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/),  // YYYY-MM-DD
  startTime:   z.string().regex(/^\d{2}:\d{2}$/).optional(),  // HH:MM
  endTime:     z.string().regex(/^\d{2}:\d{2}$/).optional(),
  title:       z.string().min(1).max(80),
  description: z.string().max(300).optional(),
  type:        ItineraryItemTypeSchema,
  location:    z.object({
    name:      z.string().max(100),
    lat:       z.number().min(-90).max(90).optional(),
    lng:       z.number().min(-180).max(180).optional(),
    placeId:   z.string().max(300).optional(),   // Mapbox place ID
  }).optional(),
  cost:        z.number().nonnegative().optional(),
  currency:    z.string().length(3).default('INR'),
  bookingRef:  z.string().max(100).optional(),
  createdBy:   z.string().min(1),
  createdAt:   z.unknown(),   // Firestore Timestamp
  order:       z.number().int().nonnegative(),   // Sort order within a day
})

export const ItineraryCreateSchema = ItineraryItemSchema.omit({ id: true })
export const ItineraryUpdateSchema = ItineraryItemSchema
  .partial()
  .required({ id: true, groupId: true })
  .omit({ createdBy: true, createdAt: true })

export type ItineraryItemInput = z.infer<typeof ItineraryItemSchema>
export type ItineraryCreate = z.infer<typeof ItineraryCreateSchema>
export type ItineraryUpdate = z.infer<typeof ItineraryUpdateSchema>
