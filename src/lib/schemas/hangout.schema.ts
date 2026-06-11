// src/lib/schemas/hangout.schema.ts
// Hangout Planner — data model for lightweight group meetup coordination.
//
// STATUS FLOW: proposed → confirmed | canceled → completed
// RSVP MAP: per-user vote, denormalized for speed, counters derived deterministically.
// QUORUM: yes-votes >= quorumThreshold triggers auto-confirm.

import { z } from 'zod'

// ── RSVP ─────────────────────────────────────────────────────────────
export const RsvpValueSchema = z.enum(['yes', 'maybe', 'no'])
export type RsvpValue = z.infer<typeof RsvpValueSchema>

export const RsvpEntrySchema = z.object({
  value:    RsvpValueSchema,
  votedAt:  z.unknown(), // Firestore Timestamp
})
export type RsvpEntry = z.infer<typeof RsvpEntrySchema>

// ── Status ────────────────────────────────────────────────────────────
export const HangoutStatusSchema = z.enum(['proposed', 'confirmed', 'canceled', 'completed'])
export type HangoutStatus = z.infer<typeof HangoutStatusSchema>

// ── Hangout document (groups/<groupId>/hangouts/<hangoutId>) ──────────
export const HangoutSchema = z.object({
  id:             z.string().min(1).max(128),
  groupId:        z.string().min(1),
  title:          z.string().min(1).max(100),
  proposedBy:     z.string().min(1),         // uid
  proposedAt:     z.unknown(),               // Firestore Timestamp

  // ── Schedule ──────────────────────────────────────────────────────
  // Stored as ISO strings for portability. Combined timestamp derivable.
  scheduledDate:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  scheduledTime:  z.string().regex(/^\d{2}:\d{2}$/).optional(), // HH:MM

  // ── Optional details ──────────────────────────────────────────────
  placeName:      z.string().max(100).optional(),
  budgetEstimate: z.number().nonnegative().optional(), // In group's currency unit
  note:           z.string().max(300).optional(),

  // ── Quorum + RSVP ─────────────────────────────────────────────────
  quorumThreshold: z.number().int().positive().default(2), // Min yes-votes to confirm
  rsvps:           z.record(z.string(), RsvpEntrySchema).default({}), // uid → RsvpEntry
  yesCount:        z.number().int().nonnegative().default(0),  // Denormalized for query
  maybeCount:      z.number().int().nonnegative().default(0),
  noCount:         z.number().int().nonnegative().default(0),

  // ── Status ────────────────────────────────────────────────────────
  status:          HangoutStatusSchema.default('proposed'),
  confirmedAt:     z.unknown().optional(),   // Firestore Timestamp
  updatedAt:       z.unknown(),              // Firestore Timestamp
})

export const HangoutCreateSchema = HangoutSchema.omit({
  id: true, proposedAt: true, updatedAt: true, confirmedAt: true,
  yesCount: true, maybeCount: true, noCount: true, rsvps: true,
})

export const HangoutUpdateSchema = HangoutSchema
  .partial()
  .required({ id: true })
  .omit({ groupId: true, proposedBy: true, proposedAt: true })

export type Hangout       = z.infer<typeof HangoutSchema>
export type HangoutCreate = z.infer<typeof HangoutCreateSchema>
export type HangoutUpdate = z.infer<typeof HangoutUpdateSchema>
