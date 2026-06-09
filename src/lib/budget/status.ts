// src/lib/budget/status.ts

export type BudgetHealth = 'no_budget' | 'healthy' | 'warning' | 'critical' | 'over'

export interface BudgetHealthMeta {
  health: BudgetHealth
  title: string
  subtitle: string
  tone: 'neutral' | 'positive' | 'warning' | 'danger'
}

export function getBudgetHealth(params: {
  totalBudget: number | null
  totalSpent: number
  percentUsed: number
}): BudgetHealthMeta {
  const { totalBudget } = params

  if (totalBudget === null || totalBudget === undefined || totalBudget <= 0) {
    return {
      health: 'no_budget',
      title: 'No trip budget set',
      subtitle: 'Add one to track spend properly.',
      tone: 'neutral',
    }
  }

  const percent = params.percentUsed

  if (percent > 100) {
    return {
      health: 'over',
      title: 'Budget exceeded',
      subtitle: 'Trip spend is now above the planned amount.',
      tone: 'danger',
    }
  } else if (percent >= 90) {
    return {
      health: 'critical',
      title: 'Almost at the limit',
      subtitle: 'One or two more expenses may push you over.',
      tone: 'danger',
    }
  } else if (percent >= 70) {
    return {
      health: 'warning',
      title: 'Budget is tightening',
      subtitle: 'Keep an eye on bigger expenses.',
      tone: 'warning',
    }
  } else {
    return {
      health: 'healthy',
      title: "You're on track",
      subtitle: 'Spending is within a comfortable range.',
      tone: 'positive',
    }
  }
}
