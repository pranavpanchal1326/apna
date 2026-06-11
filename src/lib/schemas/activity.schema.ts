// src/lib/schemas/activity.schema.ts
import { z } from 'zod'

export const ActivityTypeSchema = z.enum([
  'expense_added',
  'member_joined',
  'settled',
  'note',
  'trip_event',
  'budget-set',
  'budget-updated',
  'budget-removed',
  // ── List events ─────────────────────────────────
  'list_created',
  'list_item_claimed',
  'list_item_completed',
  'list_items_added',
  // ── Hangout events ───────────────────────────────
  'hangout_proposed',
  'hangout_rsvp',
  'hangout_confirmed',
])
export type ActivityType = z.infer<typeof ActivityTypeSchema>

export const ActivityMetadataSchema = z.object({
  title:        z.string().max(100).optional(),
  amount:       z.number().nonnegative().optional(),
  note:         z.string().max(300).optional(),
  expenseId:    z.string().optional(),
  settlementId: z.string().optional(),
  previousAmount: z.number().nonnegative().optional(),
  // ── List metadata ──────────────────────────────
  listId:       z.string().optional(),
  listTitle:    z.string().optional(),
  itemText:     z.string().optional(),
  itemCount:    z.number().int().nonnegative().optional(),
  // ── Hangout metadata ────────────────────────────
  hangoutId:     z.string().optional(),
  scheduledDate: z.string().optional(),
  rsvpValue:     z.string().optional(),  // 'yes' | 'maybe' | 'no'
  yesCount:      z.number().int().nonnegative().optional(),
}).optional()


export const ActivityItemSchema = z.object({
  id:        z.string().min(1).max(128),
  actorUid:  z.string().min(1),
  type:      ActivityTypeSchema,
  createdAt: z.unknown(), // Firestore Timestamp
  metadata:  ActivityMetadataSchema,
})

export type ActivityItem = z.infer<typeof ActivityItemSchema>
