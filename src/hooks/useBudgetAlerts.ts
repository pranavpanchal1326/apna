// src/hooks/useBudgetAlerts.ts
import { useMemo } from 'react'
import { BudgetHealth, getBudgetHealth } from '@lib/budget/status'
import { formatBudgetAmount } from '@lib/budget/format'

export interface UseBudgetAlertsParams {
  totalBudget: number | null
  totalSpent: number
  percentUsed: number
  currency?: string
}

export interface BudgetAlert {
  visible: boolean
  health: BudgetHealth
  tone: 'neutral' | 'positive' | 'warning' | 'danger'
  title: string
  description: string
}

export function useBudgetAlerts(params: UseBudgetAlertsParams): BudgetAlert {
  const { totalBudget, totalSpent, percentUsed, currency = 'INR' } = params

  return useMemo(() => {
    if (totalBudget === null || totalBudget <= 0) {
      return {
        visible: false,
        health: 'no_budget',
        tone: 'neutral',
        title: '',
        description: '',
      }
    }

    const healthMeta = getBudgetHealth({
      totalBudget,
      totalSpent,
      percentUsed,
    })

    const visible =
      healthMeta.health === 'warning' ||
      healthMeta.health === 'critical' ||
      healthMeta.health === 'over'

    let description = ''
    if (healthMeta.health === 'warning') {
      description = `You have spent ${percentUsed.toFixed(0)}% of your budget. Keep an eye on upcoming expenses.`
    } else if (healthMeta.health === 'critical') {
      description = `Critical warning: Spent ${percentUsed.toFixed(0)}% of your budget. Limit non-essential trip activities.`
    } else if (healthMeta.health === 'over') {
      const overAmount = totalSpent - totalBudget
      description = `Trip budget has been exceeded by ${formatBudgetAmount(overAmount, currency)}.`
    }

    return {
      visible,
      health: healthMeta.health,
      tone: healthMeta.tone,
      title: healthMeta.title,
      description,
    }
  }, [totalBudget, totalSpent, percentUsed, currency])
}
