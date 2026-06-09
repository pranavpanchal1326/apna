// src/lib/budget/thresholds.ts

export type BudgetThreshold = 70 | 90 | 100

export interface ThresholdCrossingResult {
  crossed: boolean
  threshold: BudgetThreshold | null
}

/**
 * Detects if spending has crossed 70%, 90%, or 100% of the total budget in an upward direction.
 */
export function detectBudgetThresholdCrossing(params: {
  totalBudget: number | null
  previousSpent: number
  currentSpent: number
}): ThresholdCrossingResult {
  const { totalBudget, previousSpent, currentSpent } = params
  if (!totalBudget || totalBudget <= 0) {
    return { crossed: false, threshold: null }
  }

  const prevPercent = (previousSpent / totalBudget) * 100
  const currPercent = (currentSpent / totalBudget) * 100

  // Check from highest to lowest threshold to find the most significant crossing
  const thresholds: BudgetThreshold[] = [100, 90, 70]
  for (const t of thresholds) {
    if (currPercent >= t && prevPercent < t) {
      return { crossed: true, threshold: t }
    }
  }

  return { crossed: false, threshold: null }
}

export function getThresholdLabel(threshold: BudgetThreshold): string {
  switch (threshold) {
    case 70:
      return '70%'
    case 90:
      return '90%'
    case 100:
      return '100%'
    default:
      return ''
  }
}
