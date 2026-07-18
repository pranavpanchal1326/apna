// src/lib/budget/__tests__/format.test.ts
import { formatBudgetAmount, formatBudgetDelta, formatPercent } from '../format'

describe('formatBudgetAmount', () => {
  it('formats INR with the rupee sign and Indian grouping', () => {
    expect(formatBudgetAmount(100000)).toBe('₹1,00,000')
  })

  it('defaults to INR', () => {
    expect(formatBudgetAmount(500)).toBe('₹500')
  })
})

describe('formatBudgetDelta', () => {
  it('prefixes a plus sign for positive deltas', () => {
    expect(formatBudgetDelta(250)).toBe('+₹250')
  })

  it('keeps the native minus sign for negative deltas (no double sign)', () => {
    const out = formatBudgetDelta(-250)
    expect(out).not.toContain('+')
    expect(out).toContain('250')
  })

  it('does not prefix zero', () => {
    expect(formatBudgetDelta(0)).toBe('₹0')
  })
})

describe('formatPercent', () => {
  it('rounds to a whole percent', () => {
    expect(formatPercent(69.6)).toBe('70%')
    expect(formatPercent(70.4)).toBe('70%')
  })

  it('handles zero', () => {
    expect(formatPercent(0)).toBe('0%')
  })
})
