// src/hooks/useBudgetForecast.ts
import { useMemo } from 'react'
import { useBudget } from './useBudget'
import {
  buildBudgetForecast,
  calculateBurnRate,
  type BudgetForecastPoint,
  type BudgetForecastResult,
  type BurnRateResult,
} from '@lib/budget'
import { parseISO, differenceInDays } from 'date-fns'

export interface UseBudgetForecastResult {
  forecast: BudgetForecastResult | null
  burnRate: BurnRateResult | null
  points: BudgetForecastPoint[]
  isLoading: boolean
}

export function useBudgetForecast(groupId: string | null): UseBudgetForecastResult {
  const { group, summary, expenses, isLoading } = useBudget(groupId)

  return useMemo(() => {
    if (!groupId || !summary || expenses.length === 0) {
      return {
        forecast: null,
        burnRate: null,
        points: [],
        isLoading,
      }
    }

    // Filter active expenses and those having a valid date
    const activeExpenses = expenses.filter(
      (exp) => exp.status !== 'deleted' && exp.date
    )

    if (activeExpenses.length === 0) {
      return {
        forecast: null,
        burnRate: null,
        points: [],
        isLoading,
      }
    }

    // Group expense amounts by date string (YYYY-MM-DD)
    const dailySpendMap: Record<string, number> = {}
    activeExpenses.forEach((exp) => {
      const dateStr = exp.date!
      dailySpendMap[dateStr] = (dailySpendMap[dateStr] || 0) + exp.amount
    })

    const uniqueDates = Object.keys(dailySpendMap).sort()
    const firstExpenseDate = uniqueDates[0] || null
    const latestExpenseDate = uniqueDates[uniqueDates.length - 1] || null

    // Map to timeline points (dayIndex, spendRupees)
    let points: BudgetForecastPoint[] = []

    const startStr = group?.startDate || firstExpenseDate
    if (startStr) {
      try {
        const start = parseISO(startStr)
        points = uniqueDates.map((dateStr) => {
          const date = parseISO(dateStr)
          const dayIndex = Math.max(0, differenceInDays(date, start))
          return {
            dayIndex,
            spendRupees: dailySpendMap[dateStr],
          }
        })
      } catch {
        points = []
      }
    }

    // Sort points by dayIndex
    points.sort((a, b) => a.dayIndex - b.dayIndex)

    const totalBudgetRupees = group?.totalBudget ?? null
    const totalSpentRupees = summary.totalSpent

    const forecast = buildBudgetForecast({
      totalBudgetRupees,
      totalSpentRupees,
      tripStartDate: group?.startDate,
      tripEndDate: group?.endDate,
      expenseTimeline: points,
    })

    const burnRate = calculateBurnRate({
      totalSpentRupees,
      firstExpenseDate,
      latestExpenseDate,
      tripStartDate: group?.startDate,
      tripEndDate: group?.endDate,
      totalBudgetRupees,
    })

    return {
      forecast,
      burnRate,
      points,
      isLoading,
    }
  }, [groupId, group, summary, expenses, isLoading])
}
