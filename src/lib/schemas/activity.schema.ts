// src/lib/schemas/activity.schema.ts
import { z } from 'zod'

export const ActivityTypeSchema = z.enum([
  'expense_added',
  'member_joined',
  'settled',
  'note',
  'trip_event',
  'budgetset',
  'budgetupdated',
  'budgetremoved',
])
export type ActivityType = z.infer<typeof ActivityTypeSchema>

export const ActivityMetadataSchema = z.object({
  title:        z.string().max(100).optional(),
  amount:       z.number().nonnegative().optional(),
  note:         z.string().max(300).optional(),
  expenseId:    z.string().optional(),
  settlementId: z.string().optional(),
  previousAmount: z.number().nonnegative().optional(),
}).optional()


export const ActivityItemSchema = z.object({
  id:        z.string().min(1).max(128),
  actorUid:  z.string().min(1),
  type:      ActivityTypeSchema,
  createdAt: z.unknown(), // Firestore Timestamp
  metadata:  ActivityMetadataSchema,
})

export type ActivityItem = z.infer<typeof ActivityItemSchema>
