// src/lib/schemas/__tests__/recurringExpense.schema.test.ts
import {
  RecurringExpenseSchema,
  RecurringExpenseCreateSchema,
} from '../recurringExpense.schema'

const valid = {
  id: 'rec_1',
  groupId: 'grp_1',
  description: 'Rent',
  amount: 20000,
  category: 'stay' as const,
  paidBy: 'uid_a',
  splitType: 'equal' as const,
  splits: { uid_a: 10000, uid_b: 10000 },
  frequency: 'monthly' as const,
  dayOfMonth: 1,
  nextRunDate: '2026-02-01',
  createdBy: 'uid_a',
  createdAt: {},
}

describe('RecurringExpenseSchema', () => {
  it('accepts a valid monthly template and defaults active to true', () => {
    const parsed = RecurringExpenseSchema.parse(valid)
    expect(parsed.active).toBe(true)
    expect(parsed.currency).toBe('INR')
  })

  it('accepts a weekly template without dayOfMonth', () => {
    const { dayOfMonth, ...weekly } = { ...valid, frequency: 'weekly' as const }
    expect(RecurringExpenseSchema.safeParse(weekly).success).toBe(true)
  })

  it('rejects an unknown frequency', () => {
    expect(RecurringExpenseSchema.safeParse({ ...valid, frequency: 'daily' }).success).toBe(false)
  })

  it('rejects dayOfMonth outside 1..31', () => {
    expect(RecurringExpenseSchema.safeParse({ ...valid, dayOfMonth: 0 }).success).toBe(false)
    expect(RecurringExpenseSchema.safeParse({ ...valid, dayOfMonth: 32 }).success).toBe(false)
  })

  it('rejects a malformed nextRunDate', () => {
    expect(RecurringExpenseSchema.safeParse({ ...valid, nextRunDate: 'tomorrow' }).success).toBe(false)
  })

  it('rejects a non-positive amount', () => {
    expect(RecurringExpenseSchema.safeParse({ ...valid, amount: -1 }).success).toBe(false)
  })
})

describe('RecurringExpenseCreateSchema', () => {
  it('does not require an id', () => {
    const { id, ...noId } = valid
    expect(RecurringExpenseCreateSchema.safeParse(noId).success).toBe(true)
  })
})
