import type { Timestamp } from 'firebase/firestore'

export type ExpenseCategory =
  | 'food'
  | 'stay'
  | 'transport'
  | 'activities'
  | 'shopping'
  | 'misc'

export type SplitType =
  | 'equal'         // Total ÷ ALL selected members equally
  | 'equal_subset'  // Total ÷ a specific subset of members only
  | 'custom'        // Each person enters their exact amount
  | 'percentage'    // Each person enters their percentage share
  | 'by_item'       // Restaurant-style: each line item tagged per person

export interface Expense {
  id: string
  groupId: string
  description: string
  amount: number                  // Total bill amount in `currency`
  currency: string                // 'INR' | 'USD' | 'EUR' | 'AED' | 'THB'
  exchangeRateToBase: number      // Locked at entry time — never recalculated retroactively
  category: ExpenseCategory
  paidBy: string                  // userId — exactly one person pays the whole bill
  splitType: SplitType
  splits: Record<string, number>  // userId → exact amount owed (in base currency)
  receiptUrl?: string             // Firebase Storage URL — populated in Prompt 3.4
  notes?: string
  date: string                    // YYYY-MM-DD — user-entered date, not createdAt
  createdAt: Timestamp
  createdBy: string               // userId — who entered the expense in the app
}

export interface Settlement {
  from: string    // userId who owes money
  to: string      // userId who is owed money
  amount: number  // Amount in base currency, rounded to 2 decimal places
}

export interface GroupBalances {
  groupId: string
  lastCalculated: Timestamp
  netBalances: Record<string, number> // positive = owed to them, negative = they owe others
  settlements: Settlement[]           // Minimum transactions to clear all debts
}

// UI metadata for expense categories — used in category picker and feed display
export const EXPENSE_CATEGORY_META: Record<
  ExpenseCategory,
  { label: string; emoji: string }
> = {
  food:       { label: 'Food & Drinks', emoji: '🍽️' },
  stay:       { label: 'Stay',          emoji: '🏨' },
  transport:  { label: 'Transport',     emoji: '🚗' },
  activities: { label: 'Activities',    emoji: '🎯' },
  shopping:   { label: 'Shopping',      emoji: '🛍️' },
  misc:       { label: 'Misc',          emoji: '📌' },
}
