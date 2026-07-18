// src/lib/budget/__tests__/forecast.test.ts
import { buildBudgetForecast, BudgetForecastPoint } from '../forecast'

const TODAY = new Date('2026-01-10T12:00:00.000Z')

beforeAll(() => {
  jest.useFakeTimers()
  jest.setSystemTime(TODAY)
})

afterAll(() => {
  jest.useRealTimers()
})

const flatTimeline: BudgetForecastPoint[] = [
  { dayIndex: 0, spendRupees: 1000 },
  { dayIndex: 1, spendRupees: 1000 },
  { dayIndex: 2, spendRupees: 1000 },
  { dayIndex: 3, spendRupees: 1000 },
  { dayIndex: 4, spendRupees: 1000 },
]

describe('buildBudgetForecast', () => {
  it('projects trip spend from the average daily rate across the full trip length', () => {
    const r = buildBudgetForecast({
      totalBudgetRupees: 10000,
      totalSpentRupees: 5000,
      tripStartDate: '2026-01-06', // 5 elapsed days
      tripEndDate: '2026-01-15', // 10-day trip
      expenseTimeline: flatTimeline,
    })
    expect(r.averageDailySpend).toBe(1000)
    expect(r.projectedTripSpend).toBe(10000)
    expect(r.projectedOverrun).toBe(0)
    expect(r.budgetRemainingAfterToday).toBe(5000)
  })

  it('flags a projected overrun when the pace outruns the budget', () => {
    const r = buildBudgetForecast({
      totalBudgetRupees: 8000,
      totalSpentRupees: 5000, // 1000/day * 10 days = 10000 projected
      tripStartDate: '2026-01-06',
      tripEndDate: '2026-01-15',
      expenseTimeline: flatTimeline,
    })
    expect(r.projectedTripSpend).toBe(10000)
    expect(r.projectedOverrun).toBe(2000)
  })

  it('rates confidence "high" once enough days have elapsed', () => {
    const r = buildBudgetForecast({
      totalBudgetRupees: 10000,
      totalSpentRupees: 5000,
      tripStartDate: '2026-01-06',
      tripEndDate: '2026-01-15',
      expenseTimeline: flatTimeline,
    })
    expect(r.confidence).toBe('high')
  })

  it('rates confidence "low" with too little data', () => {
    const r = buildBudgetForecast({
      totalBudgetRupees: 10000,
      totalSpentRupees: 1000,
      tripStartDate: '2026-01-10', // same day -> 1 elapsed day
      tripEndDate: '2026-01-15',
      expenseTimeline: [{ dayIndex: 0, spendRupees: 1000 }],
    })
    expect(r.confidence).toBe('low')
  })

  it('detects a rising spend trend', () => {
    const r = buildBudgetForecast({
      totalBudgetRupees: 10000,
      totalSpentRupees: 1200,
      tripStartDate: '2026-01-06',
      tripEndDate: '2026-01-15',
      expenseTimeline: [
        { dayIndex: 0, spendRupees: 100 },
        { dayIndex: 1, spendRupees: 100 },
        { dayIndex: 2, spendRupees: 500 },
        { dayIndex: 3, spendRupees: 500 },
      ],
    })
    expect(r.trend).toBe('up')
  })

  it('detects a falling spend trend', () => {
    const r = buildBudgetForecast({
      totalBudgetRupees: 10000,
      totalSpentRupees: 1200,
      tripStartDate: '2026-01-06',
      tripEndDate: '2026-01-15',
      expenseTimeline: [
        { dayIndex: 0, spendRupees: 500 },
        { dayIndex: 1, spendRupees: 500 },
        { dayIndex: 2, spendRupees: 100 },
        { dayIndex: 3, spendRupees: 100 },
      ],
    })
    expect(r.trend).toBe('down')
  })

  it('computes days of runway from remaining budget and daily pace', () => {
    const r = buildBudgetForecast({
      totalBudgetRupees: 10000,
      totalSpentRupees: 5000, // 5000 remaining, 1000/day -> 5 days
      tripStartDate: '2026-01-06',
      tripEndDate: '2026-01-15',
      expenseTimeline: flatTimeline,
    })
    expect(r.daysOfRunway).toBe(5)
  })

  it('reports zero runway once the budget is exhausted', () => {
    const r = buildBudgetForecast({
      totalBudgetRupees: 4000,
      totalSpentRupees: 5000,
      tripStartDate: '2026-01-06',
      tripEndDate: '2026-01-15',
      expenseTimeline: flatTimeline,
    })
    expect(r.daysOfRunway).toBe(0)
    expect(r.budgetRemainingAfterToday).toBe(0)
  })

  it('leaves budget-relative fields null when no budget is set', () => {
    const r = buildBudgetForecast({
      totalBudgetRupees: null,
      totalSpentRupees: 5000,
      tripStartDate: '2026-01-06',
      tripEndDate: '2026-01-15',
      expenseTimeline: flatTimeline,
    })
    expect(r.projectedOverrun).toBeNull()
    expect(r.daysOfRunway).toBeNull()
    expect(r.budgetRemainingAfterToday).toBeNull()
  })

  it('treats a not-yet-started trip as zero elapsed days', () => {
    const r = buildBudgetForecast({
      totalBudgetRupees: 10000,
      totalSpentRupees: 500,
      tripStartDate: '2026-02-01', // starts after "today"
      tripEndDate: '2026-02-10',
      expenseTimeline: [{ dayIndex: 0, spendRupees: 500 }],
    })
    // elapsed 0 -> averageDailySpend falls back to total spent
    expect(r.averageDailySpend).toBe(500)
  })

  it('derives elapsed days from the timeline when no trip start is given', () => {
    const r = buildBudgetForecast({
      totalBudgetRupees: null,
      totalSpentRupees: 900,
      tripStartDate: null,
      tripEndDate: null,
      expenseTimeline: [
        { dayIndex: 0, spendRupees: 300 },
        { dayIndex: 2, spendRupees: 600 }, // maxDay 2 -> 3 elapsed days
      ],
    })
    expect(r.averageDailySpend).toBe(300)
    expect(r.projectedTripSpend).toBeNull() // no trip window -> cannot project
  })

  it('guards against an end date before the start date', () => {
    const r = buildBudgetForecast({
      totalBudgetRupees: 10000,
      totalSpentRupees: 5000,
      tripStartDate: '2026-01-15',
      tripEndDate: '2026-01-06', // inverted -> N clamped to 1
      expenseTimeline: flatTimeline,
    })
    expect(r.projectedTripSpend).not.toBeNull()
  })

  it('handles malformed trip dates without throwing', () => {
    const r = buildBudgetForecast({
      totalBudgetRupees: 10000,
      totalSpentRupees: 5000,
      tripStartDate: 'not-a-date',
      tripEndDate: 'also-bad',
      expenseTimeline: flatTimeline,
    })
    expect(r).toBeDefined()
  })

  it('caps projected spend at actual once the trip is over', () => {
    const r = buildBudgetForecast({
      totalBudgetRupees: 10000,
      totalSpentRupees: 5000,
      tripStartDate: '2025-12-20',
      tripEndDate: '2025-12-30', // trip already ended before "today"
      expenseTimeline: flatTimeline,
    })
    expect(r.projectedTripSpend).toBe(5000)
  })
})
