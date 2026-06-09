// src/lib/budget/thresholds.ts

export type BudgetThreshold = 70 | 90 | 100

export interface BudgetThresholdCrossing {
  crossed: boolean
  threshold: BudgetThreshold | null
  direction: 'up' | 'down' | null
}

/**
 * Detects whether the group has crossed a major budget threshold (70, 90, 100).
 * Upward crossing takes precedence. If multiple thresholds are crossed, return the highest.
 */
export function detectBudgetThresholdCrossing(params: {
  previousPercentUsed: number
  nextPercentUsed: number
}): BudgetThresholdCrossing {
  const { previousPercentUsed, nextPercentUsed } = params

  const thresholds: BudgetThreshold[] = [100, 90, 70]

  // Detect upward crossings
  for (const t of thresholds) {
    if (nextPercentUsed >= t && previousPercentUsed < t) {
      return { crossed: true, threshold: t, direction: 'up' }
    }
  }

  // Detect downward crossings
  for (const t of thresholds) {
    if (nextPercentUsed < t && previousPercentUsed >= t) {
      return { crossed: true, threshold: t, direction: 'down' }
    }
  }

  return { crossed: false, threshold: null, direction: null }
}

export function getThresholdLabel(threshold: BudgetThreshold): string {
  switch (threshold) {
    case 70:
      return '70% used'
    case 90:
      return '90% used'
    case 100:
      return 'Budget exceeded'
    default:
      return ''
  }
}
