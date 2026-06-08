// src/lib/utils/currency.ts
// Currency formatting and utility functions.

export function formatINR(amount: number): string {
  return '₹' + amount.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}
