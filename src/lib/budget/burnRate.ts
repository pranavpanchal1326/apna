// src/lib/budget/burnRate.ts
import { differenceInDays, parseISO } from 'date-fns'

export interface BurnRateResult {
  periodDays: number
  spentPerDay: number
  spentPerWeek: number
  paceLabel: 'slow' | 'steady' | 'fast' | 'critical'
}

export function calculateBurnRate(params: {
  totalSpentRupees: number
  firstExpenseDate?: string | null
  latestExpenseDate?: string | null
  tripStartDate?: string | null
  tripEndDate?: string | null
  totalBudgetRupees?: number | null
}): BurnRateResult {
  const {
    totalSpentRupees,
    firstExpenseDate,
    latestExpenseDate,
    tripStartDate,
    tripEndDate,
    totalBudgetRupees,
  } = params

  if (totalSpentRupees <= 0) {
    return {
      periodDays: 1,
      spentPerDay: 0,
      spentPerWeek: 0,
      paceLabel: 'steady',
    }
  }

  // Calculate elapsed days
  let periodDays = 1
  const baseDateStr = tripStartDate || firstExpenseDate
  if (baseDateStr) {
    try {
      const start = parseISO(baseDateStr)
      const today = new Date()
      if (today >= start) {
        periodDays = differenceInDays(today, start) + 1
      }
    } catch {
      periodDays = 1
    }
  }

  const spentPerDay = totalSpentRupees / periodDays
  const spentPerWeek = spentPerDay * 7

  // Pace label calculation relative to daily budget allocation
  let paceLabel: BurnRateResult['paceLabel'] = 'steady'

  if (totalBudgetRupees && totalBudgetRupees > 0) {
    // Estimate total trip days
    let totalTripDays = 5 // default fallback
    const startStr = tripStartDate || firstExpenseDate
    const endStr = tripEndDate || latestExpenseDate
    if (startStr && endStr) {
      try {
        totalTripDays = differenceInDays(parseISO(endStr), parseISO(startStr)) + 1
        if (totalTripDays <= 0) totalTripDays = 1
      } catch {
        totalTripDays = 5
      }
    }

    const idealDailySpend = totalBudgetRupees / totalTripDays
    const ratio = spentPerDay / idealDailySpend

    if (ratio > 1.2) {
      paceLabel = 'critical'
    } else if (ratio > 1.0) {
      paceLabel = 'fast'
    } else if (ratio > 0.75) {
      paceLabel = 'steady'
    } else {
      paceLabel = 'slow'
    }
  }

  return {
    periodDays,
    spentPerDay,
    spentPerWeek,
    paceLabel,
  }
}
