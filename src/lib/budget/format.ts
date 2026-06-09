// src/lib/budget/format.ts
import { formatAmount } from '@lib/utils/date'

export function formatBudgetAmount(amount: number, currency: string = 'INR'): string {
  return formatAmount(amount, currency)
}

export function formatBudgetDelta(amount: number, currency: string = 'INR'): string {
  const prefix = amount > 0 ? '+' : ''
  return `${prefix}${formatAmount(amount, currency)}`
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`
}
