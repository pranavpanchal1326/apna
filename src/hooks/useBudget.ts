// src/hooks/useBudget.ts
import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  fetchBudgetGroup,
  subscribeToBudgetExpenses,
  fetchBudgetExpenses,
  type BudgetGroupInput,
  type BudgetExpenseInput,
} from '@lib/firebase/budget'
import {
  buildBudgetSummary,
  getBudgetHealth,
  type BudgetSummary,
  type BudgetHealthMeta,
} from '@lib/budget'
import { captureError } from '@lib/sentry'

export interface UseBudgetResult {
  group: BudgetGroupInput | null
  summary: BudgetSummary | null
  health: BudgetHealthMeta | null
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  expenses: BudgetExpenseInput[]
}

export function useBudget(groupId: string | null): UseBudgetResult {
  const [group, setGroup] = useState<BudgetGroupInput | null>(null)
  const [expenses, setExpenses] = useState<BudgetExpenseInput[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadAll = useCallback(async (gId: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const [gData, eData] = await Promise.all([
        fetchBudgetGroup(gId),
        fetchBudgetExpenses(gId),
      ])
      setGroup(gData)
      setExpenses(eData)
    } catch (err) {
      captureError(err, { source: 'useBudget_loadAll', groupId: gId })
      setError('Failed to load budget data.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!groupId) {
      setGroup(null)
      setExpenses([])
      setError(null)
      return
    }

    loadAll(groupId)

    const unsubscribe = subscribeToBudgetExpenses(
      groupId,
      (eData) => {
        setExpenses(eData)
      },
      (err) => {
        captureError(err, { source: 'useBudget_subscription', groupId })
        setError('Failed to sync expenses in real time.')
      }
    )

    return () => {
      unsubscribe()
    }
  }, [groupId, loadAll])

  const refresh = useCallback(async () => {
    if (!groupId) return
    await loadAll(groupId)
  }, [groupId, loadAll])

  const summary = useMemo(() => {
    if (!groupId) return null
    return buildBudgetSummary({
      totalBudget: group?.totalBudget,
      expenses,
    })
  }, [group, expenses, groupId])

  const health = useMemo(() => {
    if (!summary) return null
    return getBudgetHealth({
      totalBudget: summary.totalBudget,
      totalSpent: summary.totalSpent,
      percentUsed: summary.percentUsed,
    })
  }, [summary])

  return {
    group,
    summary,
    health,
    isLoading,
    error,
    refresh,
    expenses,
  }
}
