// src/lib/budget/__tests__/selectors.test.ts
import { buildBudgetSummary, getTopSpendingCategory, getAverageExpense } from '../selectors'

const exp = (
  id: string,
  amount: number,
  category?: string,
  status?: string
) => ({ id, amount, category, status })

describe('buildBudgetSummary', () => {
  it('sums active expenses and excludes deleted ones', () => {
    const summary = buildBudgetSummary({
      expenses: [exp('1', 100), exp('2', 200), exp('3', 999, 'food', 'deleted')],
    })
    expect(summary.totalSpent).toBe(300)
    expect(summary.expenseCount).toBe(2)
  })

  it('buckets categories case-insensitively and maps unknown to misc', () => {
    const summary = buildBudgetSummary({
      expenses: [exp('1', 100, 'FOOD'), exp('2', 50, 'wormhole'), exp('3', 25)],
    })
    const byKey = Object.fromEntries(summary.categoryTotals.map(c => [c.key, c]))
    expect(byKey.food.amount).toBe(100)
    expect(byKey.food.count).toBe(1)
    // unknown category + missing category both fall into misc
    expect(byKey.misc.amount).toBe(75)
    expect(byKey.misc.count).toBe(2)
  })

  it('always returns all six category buckets', () => {
    const summary = buildBudgetSummary({ expenses: [] })
    expect(summary.categoryTotals.map(c => c.key).sort()).toEqual(
      ['activities', 'food', 'misc', 'shopping', 'stay', 'transport']
    )
  })

  it('computes percentOfSpend per category', () => {
    const summary = buildBudgetSummary({
      expenses: [exp('1', 750, 'stay'), exp('2', 250, 'food')],
    })
    const stay = summary.categoryTotals.find(c => c.key === 'stay')!
    expect(stay.percentOfSpend).toBeCloseTo(75)
  })

  it('sorts category totals descending by amount', () => {
    const summary = buildBudgetSummary({
      expenses: [exp('1', 100, 'food'), exp('2', 500, 'stay'), exp('3', 300, 'transport')],
    })
    const amounts = summary.categoryTotals.map(c => c.amount)
    expect(amounts).toEqual([...amounts].sort((a, b) => b - a))
    expect(summary.categoryTotals[0].key).toBe('stay')
  })

  it('computes remaining / percentUsed / overspend when a budget is set', () => {
    const summary = buildBudgetSummary({
      totalBudget: 1000,
      expenses: [exp('1', 800, 'food')],
    })
    expect(summary.remaining).toBe(200)
    expect(summary.percentUsed).toBeCloseTo(80)
    expect(summary.overspend).toBe(0)
  })

  it('reports overspend and negative remaining when over budget', () => {
    const summary = buildBudgetSummary({
      totalBudget: 1000,
      expenses: [exp('1', 1200, 'food')],
    })
    expect(summary.remaining).toBe(-200)
    expect(summary.overspend).toBe(200)
    expect(summary.percentUsed).toBeCloseTo(120)
  })

  it('leaves budget metrics null/zero when no budget is set', () => {
    const summary = buildBudgetSummary({ totalBudget: null, expenses: [exp('1', 500)] })
    expect(summary.remaining).toBeNull()
    expect(summary.percentUsed).toBe(0)
    expect(summary.overspend).toBe(0)
  })

  it('treats a zero budget as "no budget" for metrics', () => {
    const summary = buildBudgetSummary({ totalBudget: 0, expenses: [exp('1', 500)] })
    expect(summary.remaining).toBeNull()
    expect(summary.percentUsed).toBe(0)
  })
})

describe('getTopSpendingCategory', () => {
  it('returns the first category when it has spend', () => {
    const summary = buildBudgetSummary({ expenses: [exp('1', 500, 'stay'), exp('2', 100, 'food')] })
    expect(getTopSpendingCategory(summary.categoryTotals)?.key).toBe('stay')
  })

  it('returns null when there is no spend', () => {
    const summary = buildBudgetSummary({ expenses: [] })
    expect(getTopSpendingCategory(summary.categoryTotals)).toBeNull()
  })

  it('returns null for empty or missing input', () => {
    expect(getTopSpendingCategory([])).toBeNull()
    // @ts-expect-error guarding against runtime null
    expect(getTopSpendingCategory(null)).toBeNull()
  })
})

describe('getAverageExpense', () => {
  it('divides total by count', () => {
    expect(getAverageExpense(1000, 4)).toBe(250)
  })

  it('returns 0 when there are no expenses (no divide-by-zero)', () => {
    expect(getAverageExpense(1000, 0)).toBe(0)
  })
})
