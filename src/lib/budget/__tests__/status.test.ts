// src/lib/budget/__tests__/status.test.ts
import { getBudgetHealth } from '../status'

const health = (totalBudget: number | null, percentUsed: number, totalSpent = 0) =>
  getBudgetHealth({ totalBudget, totalSpent, percentUsed })

describe('getBudgetHealth', () => {
  it('is no_budget when the budget is null', () => {
    expect(health(null, 0).health).toBe('no_budget')
  })

  it('is no_budget when the budget is zero or negative', () => {
    expect(health(0, 50).health).toBe('no_budget')
    expect(health(-100, 50).health).toBe('no_budget')
  })

  it('is healthy below 70%', () => {
    const meta = health(1000, 69.9)
    expect(meta.health).toBe('healthy')
    expect(meta.tone).toBe('positive')
  })

  it('is warning at exactly 70%', () => {
    expect(health(1000, 70).health).toBe('warning')
    expect(health(1000, 70).tone).toBe('warning')
  })

  it('stays warning just under 90%', () => {
    expect(health(1000, 89.99).health).toBe('warning')
  })

  it('is critical from 90% up to 100% inclusive', () => {
    expect(health(1000, 90).health).toBe('critical')
    expect(health(1000, 100).health).toBe('critical')
    expect(health(1000, 90).tone).toBe('danger')
  })

  it('is over above 100%', () => {
    const meta = health(1000, 100.01)
    expect(meta.health).toBe('over')
    expect(meta.tone).toBe('danger')
  })

  it('always returns a title and subtitle', () => {
    for (const pct of [0, 70, 90, 101]) {
      const meta = health(1000, pct)
      expect(meta.title.length).toBeGreaterThan(0)
      expect(meta.subtitle.length).toBeGreaterThan(0)
    }
  })
})
