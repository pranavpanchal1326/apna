// src/lib/schemas/__tests__/expense.schema.test.ts
import {
  ExpenseSchema,
  ExpenseCreateSchema,
  ExpenseUpdateSchema,
} from '../expense.schema'

const validExpense = {
  id: 'exp_1',
  groupId: 'grp_1',
  description: 'Dinner',
  amount: 1000,
  category: 'food' as const,
  paidBy: 'uid_a',
  splitType: 'equal' as const,
  splits: { uid_a: 500, uid_b: 500 },
  date: '2026-01-10',
  createdBy: 'uid_a',
  createdAt: {},
}

describe('ExpenseSchema', () => {
  it('accepts a well-formed expense and applies defaults', () => {
    const parsed = ExpenseSchema.parse(validExpense)
    expect(parsed.currency).toBe('INR')
    expect(parsed.isSettled).toBe(false)
  })

  it('rejects splits that do not sum to the amount (beyond ±1 tolerance)', () => {
    const res = ExpenseSchema.safeParse({ ...validExpense, splits: { uid_a: 500, uid_b: 300 } })
    expect(res.success).toBe(false)
  })

  it('allows a ±1 rounding tolerance on the split sum', () => {
    const res = ExpenseSchema.safeParse({ ...validExpense, splits: { uid_a: 500, uid_b: 499 } })
    expect(res.success).toBe(true)
  })

  it('rejects a non-positive amount', () => {
    expect(ExpenseSchema.safeParse({ ...validExpense, amount: 0 }).success).toBe(false)
    expect(ExpenseSchema.safeParse({ ...validExpense, amount: -50 }).success).toBe(false)
  })

  it('rejects an unknown category', () => {
    expect(ExpenseSchema.safeParse({ ...validExpense, category: 'crypto' }).success).toBe(false)
  })

  it('rejects a malformed date', () => {
    expect(ExpenseSchema.safeParse({ ...validExpense, date: '10-01-2026' }).success).toBe(false)
  })

  it('rejects a negative split share', () => {
    const res = ExpenseSchema.safeParse({ ...validExpense, splits: { uid_a: 1100, uid_b: -100 } })
    expect(res.success).toBe(false)
  })

  it('rejects a description over 100 chars', () => {
    expect(ExpenseSchema.safeParse({ ...validExpense, description: 'x'.repeat(101) }).success).toBe(false)
  })

  it('rejects an empty description', () => {
    expect(ExpenseSchema.safeParse({ ...validExpense, description: '' }).success).toBe(false)
  })

  it('accepts an optional valid receiptUrl and rejects a bad one', () => {
    expect(ExpenseSchema.safeParse({ ...validExpense, receiptUrl: 'https://x.com/r.jpg' }).success).toBe(true)
    expect(ExpenseSchema.safeParse({ ...validExpense, receiptUrl: 'not-a-url' }).success).toBe(false)
  })
})

describe('ExpenseCreateSchema', () => {
  it('does not require an id', () => {
    const { id, ...noId } = validExpense
    expect(ExpenseCreateSchema.safeParse(noId).success).toBe(true)
  })

  it('still enforces the split-sum rule', () => {
    const { id, ...noId } = validExpense
    expect(ExpenseCreateSchema.safeParse({ ...noId, splits: { uid_a: 900, uid_b: 50 } }).success).toBe(false)
  })
})

describe('ExpenseUpdateSchema', () => {
  it('requires id and groupId but allows partial fields', () => {
    expect(ExpenseUpdateSchema.safeParse({ id: 'exp_1', groupId: 'grp_1', description: 'Lunch' }).success).toBe(true)
  })

  it('fails without the required id', () => {
    expect(ExpenseUpdateSchema.safeParse({ groupId: 'grp_1', description: 'Lunch' }).success).toBe(false)
  })
})
