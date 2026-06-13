import {
  calculateEqualSplit as originalEqualSplit,
  calculatePercentageSplit as originalPercentageSplit,
  validateSplits as originalValidateSplits,
} from '../utils/settlement'

export function calculateEqualSplit(total: number, memberIds: string[]): Record<string, number> {
  return originalEqualSplit(total, memberIds)
}

export function calculateCustomSplit(_total: number, splits: Record<string, number>): Record<string, number> {
  return splits
}

export function validateSplits(splits: Record<string, number>, totalAmount: number): boolean {
  if (Object.values(splits).some(val => val < 0)) return false
  return originalValidateSplits(totalAmount, splits)
}

export function calculatePercentageSplit(totalAmount: number, percentages: Record<string, number>): Record<string, number> {
  const result = originalPercentageSplit(totalAmount, percentages)
  if (!result) throw new Error('Percentages must sum to 100')
  return result
}
