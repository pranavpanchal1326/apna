// src/lib/schemas/recurringExpense.schema.ts
// Recurring expense templates (roommate mode: rent, subscriptions).
// Stored at groups/{groupId}/recurringExpenses/{templateId}.
// A daily Cloud Function (generateRecurringExpenses) materializes due
// templates into real expense docs with deterministic ids.

import { z } from 'zod'
import { ExpenseCategorySchema, SplitTypeSchema, SplitsMapSchema } from './expense.schema'

export const RecurrenceFrequencySchema = z.enum(['weekly', 'monthly'])
export type RecurrenceFrequency = z.infer<typeof RecurrenceFrequencySchema>

export const RecurringExpenseSchema = z.object({
  id:          z.string().min(1).max(128),
  groupId:     z.string().min(1).max(128),
  description: z.string().min(1).max(100),
  amount:      z.number().positive().max(1000000),
  currency:    z.string().length(3).default('INR'),
  category:    ExpenseCategorySchema,
  paidBy:      z.string().min(1),
  splitType:   SplitTypeSchema,
  splits:      SplitsMapSchema,
  frequency:   RecurrenceFrequencySchema,
  dayOfMonth:  z.number().int().min(1).max(31).optional(), // monthly anchor
  nextRunDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  active:      z.boolean().default(true),
  createdBy:   z.string().min(1),
  createdAt:   z.unknown(),
  lastGeneratedAt: z.unknown().optional(),
})

export const RecurringExpenseCreateSchema = RecurringExpenseSchema.omit({ id: true })
export type RecurringExpenseInput = z.infer<typeof RecurringExpenseSchema>
export type RecurringExpenseCreate = z.infer<typeof RecurringExpenseCreateSchema>
