// src/lib/schemas/group.schema.ts
import { z } from 'zod'

export const GroupStatusSchema = z.enum(['active', 'completed'])
export type GroupStatus = z.infer<typeof GroupStatusSchema>

export const SettlementBalanceSchema = z.object({
  fromUid: z.string(),
  toUid:   z.string(),
  amount:  z.number(),
})
export type SettlementBalance = z.infer<typeof SettlementBalanceSchema>

export const GroupSchema = z.object({
  id:           z.string().min(1).max(128),
  name:         z.string().min(1).max(60),
  destination:  z.string().max(80).optional(),
  coverEmoji:   z.string().max(8).optional(),    // e.g. "🏔️"
  startDate:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),  // YYYY-MM-DD
  endDate:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  memberIds:    z.array(z.string()).min(1).max(20),
  adminIds:     z.array(z.string()).min(1),
  createdBy:    z.string().min(1),
  createdAt:    z.unknown(),     // Firestore Timestamp
  inviteCode:   z.string().length(6).regex(/^[A-Z0-9]{6}$/),
  status:       GroupStatusSchema.default('active'),
  currency:     z.string().length(3).default('INR'),  // ISO 4217
  totalBudget:  z.number().positive().optional(),
  description:  z.string().max(200).optional(),
  balances:     z.array(SettlementBalanceSchema).default([]),
})

export const GroupCreateSchema = GroupSchema.omit({ id: true })

export const GroupUpdateSchema = GroupSchema
  .partial()
  .required({ id: true })
  .omit({ createdBy: true, createdAt: true, inviteCode: true })

export type GroupInput = z.infer<typeof GroupSchema>
export type GroupCreate = z.infer<typeof GroupCreateSchema>
export type GroupUpdate = z.infer<typeof GroupUpdateSchema>
