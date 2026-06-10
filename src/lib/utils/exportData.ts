// src/lib/utils/exportData.ts
// Aggregates raw group data into a clean structure ready for CSV and PDF exporting.

import type { GroupInput, UserInput, ExpenseInput } from '../schemas'
import { calculateNetBalances, calculateSettlements } from './settlement'

export interface ExportExpenseRow {
  id: string
  date: string
  description: string
  category: string
  amount: number
  paidByName: string
  splitType: string
  splitSummary: string
  notes: string
  createdBy: string
}

export interface ExportCategoryTotal {
  category: string
  amount: number
  percentage: number
}

export interface ExportSettlementRow {
  fromName: string
  toName: string
  amount: number
}

export interface ExportMemberBalance {
  name: string
  paidAmount: number
  owedAmount: number
  netBalance: number
}

export interface ExpenseExportBundle {
  groupName: string
  dateRange: string
  currency: string
  totalSpent: number
  expenseCount: number
  memberCount: number
  highestSpender: string
  expenses: ExportExpenseRow[]
  categories: ExportCategoryTotal[]
  memberBalances: ExportMemberBalance[]
  settlements: ExportSettlementRow[]
}

/**
 * Builds the data bundle required for rendering PDF and CSV exports.
 */
export function buildExpenseExportData(params: {
  group: GroupInput
  members: Map<string, UserInput> | UserInput[]
  expenses: ExpenseInput[]
}): ExpenseExportBundle {
  const { group, expenses } = params
  
  // Convert members to an array for easy searching
  const membersList: UserInput[] = params.members instanceof Map
    ? Array.from(params.members.values())
    : params.members

  const currency = group.currency || 'INR'

  // Calculate Date Range
  const sortedDates = expenses.map((e) => e.date).sort()
  const dateRange = sortedDates.length > 0
    ? `${sortedDates[0]} to ${sortedDates[sortedDates.length - 1]}`
    : 'No expenses tracked'

  // Calculate Total Spent
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0)

  // Identify Highest Spender
  const paidSums: Record<string, number> = {}
  expenses.forEach((e) => {
    paidSums[e.paidBy] = (paidSums[e.paidBy] ?? 0) + e.amount
  })
  let maxPaid = 0
  let highestSpenderId = ''
  Object.entries(paidSums).forEach(([uid, sum]) => {
    if (sum > maxPaid) {
      maxPaid = sum
      highestSpenderId = uid
    }
  })
  const highestSpenderUser = membersList.find((m) => m.uid === highestSpenderId)
  const highestSpender = highestSpenderId
    ? `${highestSpenderUser?.name ?? 'Someone'} (₹${maxPaid.toLocaleString('en-IN')})`
    : 'None'

  // Format Expense Rows
  const expenseRows: ExportExpenseRow[] = expenses.map((e) => {
    const payer = membersList.find((m) => m.uid === e.paidBy)
    const creator = membersList.find((m) => m.uid === e.createdBy)

    const splitSummary = Object.entries(e.splits)
      .map(([uid, share]) => {
        const member = membersList.find((m) => m.uid === uid)
        const name = member?.name?.split(' ')[0] ?? uid.substring(0, 5)
        return `${name}: ₹${share.toLocaleString('en-IN')}`
      })
      .join(', ')

    return {
      id: e.id,
      date: e.date,
      description: e.description,
      category: e.category,
      amount: e.amount,
      paidByName: payer?.name ?? e.paidBy,
      splitType: e.splitType,
      splitSummary,
      notes: e.notes ?? '',
      createdBy: creator?.name ?? e.createdBy,
    }
  })

  // Format Category Totals
  const categoryTotals: Record<string, number> = {}
  expenses.forEach((e) => {
    categoryTotals[e.category] = (categoryTotals[e.category] ?? 0) + e.amount
  })
  const totalForDiv = totalSpent || 1
  const categorySummary: ExportCategoryTotal[] = Object.entries(categoryTotals).map(([cat, amt]) => ({
    category: cat,
    amount: amt,
    percentage: Math.round((amt / totalForDiv) * 100),
  })).sort((a, b) => b.amount - a.amount)

  // Calculate Net Balances and Settlements
  const netBalances = calculateNetBalances(expenses as any, group.memberIds)
  const computedSettlements = calculateSettlements(netBalances)

  const settlements: ExportSettlementRow[] = computedSettlements.map((s) => {
    const fromUser = membersList.find((m) => m.uid === s.from)
    const toUser = membersList.find((m) => m.uid === s.to)
    return {
      fromName: fromUser?.name ?? s.from,
      toName: toUser?.name ?? s.to,
      amount: s.amount,
    }
  })

  // Format Member Balances
  const memberBalances: ExportMemberBalance[] = group.memberIds.map((uid) => {
    const member = membersList.find((m) => m.uid === uid)
    const netBalance = netBalances[uid] ?? 0

    // Paid amount is how much they paid total
    const paidAmount = paidSums[uid] ?? 0

    // Owed amount is how much they owe total (paid amount - net balance)
    const owedAmount = Math.max(0, paidAmount - netBalance)

    return {
      name: member?.name ?? 'Unknown',
      paidAmount,
      owedAmount,
      netBalance,
    }
  })

  return {
    groupName: group.name,
    dateRange,
    currency,
    totalSpent,
    expenseCount: expenses.length,
    memberCount: group.memberIds.length,
    highestSpender,
    expenses: expenseRows,
    categories: categorySummary,
    memberBalances,
    settlements,
  }
}
