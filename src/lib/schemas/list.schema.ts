// src/lib/schemas/list.schema.ts
// Shared list data model — one unified system for packing, grocery, and task lists.
// This schema is designed to be future-proof: adding templates, subtasks, or
// recurring workflows later requires no breaking schema changes.

import { z } from 'zod'

// ── List type ─────────────────────────────────────────────────────────
export const SharedListTypeSchema = z.enum(['packing', 'grocery', 'task'])
export type SharedListType = z.infer<typeof SharedListTypeSchema>

// ── Deadline urgency (derived in UI — never stored in Firestore) ──────
export const DeadlineUrgencySchema = z.enum(['none', 'upcoming', 'due_soon', 'overdue'])
export type DeadlineUrgency = z.infer<typeof DeadlineUrgencySchema>

// ── Shared List document (groups/<groupId>/lists/<listId>) ────────────
export const SharedListSchema = z.object({
  id:          z.string().min(1).max(128),
  groupId:     z.string().min(1),
  type:        SharedListTypeSchema,
  title:       z.string().min(1).max(80),
  description: z.string().max(300).optional(),
  createdBy:   z.string().min(1),
  createdAt:   z.unknown(),               // Firestore Timestamp
  updatedAt:   z.unknown(),               // Firestore Timestamp
  archived:    z.boolean().default(false),
  archivedAt:  z.unknown().optional(),    // Firestore Timestamp
  itemCount:   z.number().int().nonnegative().default(0),
  checkedCount: z.number().int().nonnegative().default(0),
})

export const SharedListCreateSchema = SharedListSchema.omit({
  id: true, createdAt: true, updatedAt: true, archivedAt: true,
  itemCount: true, checkedCount: true,
})

export const SharedListUpdateSchema = SharedListSchema
  .partial()
  .required({ id: true })
  .omit({ groupId: true, createdBy: true, createdAt: true })

export type SharedList       = z.infer<typeof SharedListSchema>
export type SharedListCreate = z.infer<typeof SharedListCreateSchema>
export type SharedListUpdate = z.infer<typeof SharedListUpdateSchema>

// ── List Item document (groups/<groupId>/lists/<listId>/items/<itemId>) ─
export const SharedListItemSchema = z.object({
  id:          z.string().min(1).max(128),
  listId:      z.string().min(1),
  groupId:     z.string().min(1),
  text:        z.string().min(1).max(200),
  notes:       z.string().max(500).optional(),
  checked:     z.boolean().default(false),
  checkedAt:   z.unknown().optional(),    // Firestore Timestamp
  checkedBy:   z.string().optional(),     // uid of who checked it

  // ── Claim ─────────────────────────────────────────────────────────
  claimedBy:   z.string().optional(),     // uid
  claimedAt:   z.unknown().optional(),    // Firestore Timestamp

  // ── Deadline ──────────────────────────────────────────────────────
  // Stored as ISO date string (YYYY-MM-DD) for portability.
  // Urgency is derived in the UI via listDeadline utility.
  deadlineDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),

  // ── Meta ──────────────────────────────────────────────────────────
  order:       z.number().default(0),     // float sort order (LexoRank-lite)
  createdBy:   z.string().min(1),
  createdAt:   z.unknown(),               // Firestore Timestamp
  updatedAt:   z.unknown(),               // Firestore Timestamp
})

export const SharedListItemCreateSchema = SharedListItemSchema.omit({
  id: true, createdAt: true, updatedAt: true,
  checkedAt: true, checkedBy: true, claimedAt: true,
})

export const SharedListItemUpdateSchema = SharedListItemSchema
  .partial()
  .required({ id: true })
  .omit({ listId: true, groupId: true, createdBy: true, createdAt: true })

export type SharedListItem       = z.infer<typeof SharedListItemSchema>
export type SharedListItemCreate = z.infer<typeof SharedListItemCreateSchema>
export type SharedListItemUpdate = z.infer<typeof SharedListItemUpdateSchema>
