// src/lib/budget/__tests__/burnRate.test.ts
import { calculateBurnRate } from '../burnRate'

// Pin "today" so parseISO / new Date() maths is deterministic.
const TODAY = new Date('2026-01-10T12:00:00.000Z')

beforeAll(() => {
  jest.useFakeTimers()
  jest.setSystemTime(TODAY)
})

afterAll(() => {
  jest.useRealTimers()
})

describe('calculateBurnRate', () => {
  it('returns a zeroed, steady result when nothing has been spent', () => {
    const r = calculateBurnRate({ totalSpentRupees: 0, tripStartDate: '2026-01-06' })
    expect(r).toEqual({ periodDays: 1, spentPerDay: 0, spentPerWeek: 0, paceLabel: 'steady' })
  })

  it('computes per-day and per-week spend over the elapsed period', () => {
    // 2026-01-06 -> 2026-01-10 is 4 days difference, +1 = 5 elapsed days
    const r = calculateBurnRate({ totalSpentRupees: 5000, tripStartDate: '2026-01-06' })
    expect(r.periodDays).toBe(5)
    expect(r.spentPerDay).toBe(1000)
    expect(r.spentPerWeek).toBe(7000)
  })

  it('falls back to the first expense date when no trip start is given', () => {
    const r = calculateBurnRate({ totalSpentRupees: 5000, firstExpenseDate: '2026-01-06' })
    expect(r.periodDays).toBe(5)
  })

  it('labels pace "steady" when spend matches the ideal daily allocation', () => {
    const r = calculateBurnRate({
      totalSpentRupees: 5000, // 1000/day
      tripStartDate: '2026-01-06',
      tripEndDate: '2026-01-15', // 10 trip days, budget 10000 -> ideal 1000/day
      totalBudgetRupees: 10000,
    })
    expect(r.paceLabel).toBe('steady')
  })

  it('labels pace "fast" when moderately over the ideal', () => {
    const r = calculateBurnRate({
      totalSpentRupees: 6000, // 1200/day, ratio 1.2
      tripStartDate: '2026-01-06',
      tripEndDate: '2026-01-15',
      totalBudgetRupees: 10000,
    })
    expect(r.paceLabel).toBe('fast')
  })

  it('labels pace "critical" when well over the ideal', () => {
    const r = calculateBurnRate({
      totalSpentRupees: 7500, // 1500/day, ratio 1.5
      tripStartDate: '2026-01-06',
      tripEndDate: '2026-01-15',
      totalBudgetRupees: 10000,
    })
    expect(r.paceLabel).toBe('critical')
  })

  it('labels pace "slow" when well under the ideal', () => {
    const r = calculateBurnRate({
      totalSpentRupees: 2000, // 400/day, ratio 0.4
      tripStartDate: '2026-01-06',
      tripEndDate: '2026-01-15',
      totalBudgetRupees: 10000,
    })
    expect(r.paceLabel).toBe('slow')
  })

  it('keeps the default steady pace when no budget is provided', () => {
    const r = calculateBurnRate({ totalSpentRupees: 99999, tripStartDate: '2026-01-06' })
    expect(r.paceLabel).toBe('steady')
  })

  it('derives trip length from first/latest expense dates when no trip window is set', () => {
    const r = calculateBurnRate({
      totalSpentRupees: 5000,
      firstExpenseDate: '2026-01-06',
      latestExpenseDate: '2026-01-15',
      totalBudgetRupees: 10000,
    })
    // ideal = 10000/10 = 1000/day; spent 1000/day -> steady
    expect(r.paceLabel).toBe('steady')
  })

  it('falls back safely when dates are malformed', () => {
    const r = calculateBurnRate({
      totalSpentRupees: 5000,
      tripStartDate: 'garbage',
      tripEndDate: 'nonsense',
      totalBudgetRupees: 10000,
    })
    // period defaults to 1 day, and a 5-day fallback trip window is used
    expect(r.periodDays).toBe(1)
    expect(r.paceLabel).toBeDefined()
  })
})
