// src/lib/budget/forecast.ts
import { differenceInDays, parseISO } from 'date-fns'

export interface BudgetForecastPoint {
  dayIndex: number
  spendRupees: number
}

export interface BudgetForecastResult {
  averageDailySpend: number
  projectedTripSpend: number | null
  projectedOverrun: number | null
  confidence: 'low' | 'medium' | 'high'
  trend: 'down' | 'flat' | 'up'
  daysOfRunway: number | null
  budgetRemainingAfterToday: number | null
}

export function buildBudgetForecast(params: {
  totalBudgetRupees: number | null
  totalSpentRupees: number
  tripStartDate?: string | null
  tripEndDate?: string | null
  expenseTimeline: BudgetForecastPoint[]
}): BudgetForecastResult {
  const { totalBudgetRupees, totalSpentRupees, tripStartDate, tripEndDate, expenseTimeline } = params

  // 1. Calculate elapsed days of the trip
  let elapsedDays = 1
  if (tripStartDate) {
    try {
      const start = parseISO(tripStartDate)
      const today = new Date()
      // If today is before start date, elapsed days is 0. Else difference in calendar days + 1
      if (today < start) {
        elapsedDays = 0
      } else {
        elapsedDays = differenceInDays(today, start) + 1
      }
    } catch {
      elapsedDays = 1
    }
  } else if (expenseTimeline.length > 0) {
    const maxDay = Math.max(...expenseTimeline.map(p => p.dayIndex))
    elapsedDays = Math.max(1, maxDay + 1)
  }

  // 2. Average Daily Spend (rupees)
  const averageDailySpend = elapsedDays > 0 ? totalSpentRupees / elapsedDays : totalSpentRupees

  // 3. Projected Trip Spend (rupees)
  let projectedTripSpend: number | null = null
  let N: number | null = null

  if (tripStartDate && tripEndDate) {
    try {
      N = differenceInDays(parseISO(tripEndDate), parseISO(tripStartDate)) + 1
      if (N <= 0) N = 1
      
      if (elapsedDays >= N) {
        // Trip is completed
        projectedTripSpend = totalSpentRupees
      } else {
        projectedTripSpend = averageDailySpend * N
      }
    } catch {
      projectedTripSpend = null
    }
  }

  // 4. Projected Overrun (rupees)
  let projectedOverrun: number | null = null
  if (totalBudgetRupees !== null && totalBudgetRupees > 0 && projectedTripSpend !== null) {
    projectedOverrun = Math.max(projectedTripSpend - totalBudgetRupees, 0)
  }

  // 5. Confidence rating
  let confidence: 'low' | 'medium' | 'high' = 'low'
  if (expenseTimeline.length >= 2 && elapsedDays >= 2) {
    if (elapsedDays >= 5) {
      confidence = 'high'
    } else {
      confidence = 'medium'
    }
  }

  // 6. Trend calculation (comparing second half of timeline vs first half)
  let trend: 'down' | 'flat' | 'up' = 'flat'
  if (expenseTimeline.length >= 2) {
    const sorted = [...expenseTimeline].sort((a, b) => a.dayIndex - b.dayIndex)
    const mid = Math.floor(sorted.length / 2)
    const firstHalf = sorted.slice(0, mid)
    const secondHalf = sorted.slice(mid)

    const firstSum = firstHalf.reduce((sum, p) => sum + p.spendRupees, 0)
    const secondSum = secondHalf.reduce((sum, p) => sum + p.spendRupees, 0)

    const firstAvg = firstSum / (firstHalf.length || 1)
    const secondAvg = secondSum / (secondHalf.length || 1)

    if (secondAvg > 1.15 * firstAvg) {
      trend = 'up'
    } else if (secondAvg < 0.85 * firstAvg) {
      trend = 'down'
    } else {
      trend = 'flat'
    }
  }

  // 7. Days of Runway
  let daysOfRunway: number | null = null
  if (totalBudgetRupees !== null && totalBudgetRupees > 0) {
    const remainingBudget = totalBudgetRupees - totalSpentRupees
    if (remainingBudget <= 0) {
      daysOfRunway = 0
    } else if (averageDailySpend > 0) {
      daysOfRunway = Math.floor(remainingBudget / averageDailySpend)
    }
  }

  // 8. Remaining budget after today
  const budgetRemainingAfterToday = totalBudgetRupees !== null
    ? Math.max(totalBudgetRupees - totalSpentRupees, 0)
    : null

  return {
    averageDailySpend,
    projectedTripSpend,
    projectedOverrun,
    confidence,
    trend,
    daysOfRunway,
    budgetRemainingAfterToday,
  }
}
