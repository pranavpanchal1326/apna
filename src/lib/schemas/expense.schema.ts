// src/lib/schemas/expense.schema.ts
import { z } from 'zod'

export const ExpenseCategorySchema = z.enum([
  'food', 'stay', 'transport', 'activities', 'shopping', 'misc'
])
export type ExpenseCategory = z.infer<typeof ExpenseCategorySchema>

export const SplitTypeSchema = z.enum(['equal', 'exact', 'percentage'])
export type SplitType = z.infer<typeof SplitTypeSchema>

// Splits map: { uid: amount } — values sum to total expense amount
export const SplitsMapSchema = z.record(
  z.string(),   // uid key
  z.number().nonnegative().max(1000000)
)

export const ExpenseSchema = z.object({
  id:          z.string().min(1).max(128),
  groupId:     z.string().min(1).max(128),
  description: z.string().min(1).max(100),
  amount:      z.number().positive().max(1000000),
  currency:    z.string().length(3).default('INR'),
  category:    ExpenseCategorySchema,
  paidBy:      z.string().min(1),   // uid of payer
  splitType:   SplitTypeSchema,
  splits:      SplitsMapSchema,     // { uid: theirShare }
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/),  // YYYY-MM-DD
  createdBy:   z.string().min(1),
  createdAt:   z.unknown(),          // Firestore Timestamp
  isSettled:   z.boolean().default(false),
  notes:       z.string().max(200).optional(),
  receiptUrl:  z.string().url().optional(),   // Phase 4 — receipt photo
}).refine(
  (data) => {
    // Splits must sum to total amount (within ₹1 rounding tolerance)
    const splitTotal = Object.values(data.splits).reduce((sum, v) => sum + v, 0)
    return Math.abs(splitTotal - data.amount) <= 1
  },
  { message: 'Split amounts must sum to total expense amount (±₹1 tolerance)' }
)

export const ExpenseCreateSchema = ExpenseSchema.omit({ id: true })
export const ExpenseUpdateSchema = ExpenseSchema
  .partial()
  .required({ id: true, groupId: true })
  .omit({ createdBy: true, createdAt: true })

export type ExpenseInput = z.infer<typeof ExpenseSchema>
export type ExpenseCreate = z.infer<typeof ExpenseCreateSchema>
export type ExpenseUpdate = z.infer<typeof ExpenseUpdateSchema>
