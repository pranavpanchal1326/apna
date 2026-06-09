// src/hooks/useBudgetAlerts.ts
import { useMemo } from 'react'
import type { BudgetSummary } from '@lib/budget/selectors'
import type { BudgetHealthMeta } from '@lib/budget/status'
import { formatBudgetAmount } from '@lib/budget/format'

export interface BudgetAlertState {
  visible: boolean
  tone: 'neutral' | 'warning' | 'danger'
  title: string
  message: string
}

export function useBudgetAlerts(params: {
  summary: BudgetSummary | null
  health: BudgetHealthMeta | null
}): BudgetAlertState {
  const { summary, health } = params

  return useMemo(() => {
    if (!summary || !health) {
      return {
        visible: false,
        tone: 'neutral',
        title: '',
        message: '',
      }
    }

    if (health.health === 'no_budget') {
      return {
        visible: true,
        tone: 'neutral',
        title: 'No trip budget set',
        message: 'Add one to track spend properly.',
      }
    }

    if (health.health === 'healthy') {
      return {
        visible: false,
        tone: 'neutral',
        title: '',
        message: '',
      }
    }

    if (health.health === 'warning') {
      return {
        visible: true,
        tone: 'warning',
        title: 'Budget is tightening',
        message: `You have spent ${summary.percentUsed.toFixed(0)}% of your budget. Keep an eye on upcoming expenses.`,
      }
    }

    if (health.health === 'critical') {
      return {
        visible: true,
        tone: 'danger',
        title: 'Almost at the limit',
        message: `Spent ${summary.percentUsed.toFixed(0)}% of your budget. One or two more expenses may push you over.`,
      }
    }

    if (health.health === 'over') {
      const overAmount = summary.overspend
      return {
        visible: true,
        tone: 'danger',
        title: 'Budget exceeded',
        message: `Trip spend is above the planned amount by ${formatBudgetAmount(overAmount, 'INR')}.`,
      }
    }

    return {
      visible: false,
      tone: 'neutral',
      title: '',
      message: '',
    }
  }, [summary, health])
}
