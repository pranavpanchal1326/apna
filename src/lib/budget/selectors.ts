// src/lib/budget/selectors.ts

export interface BudgetCategoryTotal {
  key: 'food' | 'stay' | 'transport' | 'activities' | 'shopping' | 'misc'
  label: string
  amount: number
  count: number
  percentOfSpend: number
}

export interface BudgetSummary {
  totalBudget: number | null
  totalSpent: number
  remaining: number | null
  overspend: number
  percentUsed: number
  categoryTotals: BudgetCategoryTotal[]
  expenseCount: number
}

const CATEGORY_LABELS: Record<string, string> = {
  food: 'Food',
  stay: 'Stay',
  transport: 'Transport',
  activities: 'Activities',
  shopping: 'Shopping',
  misc: 'Misc',
}

export function buildBudgetSummary(params: {
  totalBudget?: number | null
  expenses: Array<{
    id: string
    amount: number
    category?: string
    status?: string
  }>
}): BudgetSummary {
  const { totalBudget = null, expenses } = params

  // 1. Filter out deleted expenses
  const activeExpenses = expenses.filter(exp => exp.status !== 'deleted')
  const totalSpent = activeExpenses.reduce((sum, exp) => sum + exp.amount, 0)
  const expenseCount = activeExpenses.length

  // 2. Initialize category maps
  const categoriesMap: Record<BudgetCategoryTotal['key'], { amount: number; count: number }> = {
    food: { amount: 0, count: 0 },
    stay: { amount: 0, count: 0 },
    transport: { amount: 0, count: 0 },
    activities: { amount: 0, count: 0 },
    shopping: { amount: 0, count: 0 },
    misc: { amount: 0, count: 0 },
  }

  // 3. Populate category data
  activeExpenses.forEach((exp) => {
    const rawCategory = exp.category?.toLowerCase() ?? 'misc'
    const categoryKey = (rawCategory in categoriesMap ? rawCategory : 'misc') as BudgetCategoryTotal['key']
    
    categoriesMap[categoryKey].amount += exp.amount
    categoriesMap[categoryKey].count += 1
  })

  // 4. Transform into list and calculate percentages
  const categoryTotals: BudgetCategoryTotal[] = Object.keys(categoriesMap).map((key) => {
    const k = key as BudgetCategoryTotal['key']
    const { amount, count } = categoriesMap[k]
    const percentOfSpend = totalSpent > 0 ? (amount / totalSpent) * 100 : 0
    return {
      key: k,
      label: CATEGORY_LABELS[k],
      amount,
      count,
      percentOfSpend,
    }
  })

  // 5. Sort descending by amount
  categoryTotals.sort((a, b) => b.amount - a.amount)

  // 6. Calculate budget metrics
  let remaining: number | null = null
  let percentUsed = 0
  let overspend = 0

  if (totalBudget !== null && totalBudget !== undefined && totalBudget > 0) {
    remaining = totalBudget - totalSpent
    percentUsed = (totalSpent / totalBudget) * 100
    overspend = Math.max(totalSpent - totalBudget, 0)
  }

  return {
    totalBudget,
    totalSpent,
    remaining,
    overspend,
    percentUsed,
    categoryTotals,
    expenseCount,
  }
}

export function getTopSpendingCategory(
  categories: BudgetCategoryTotal[]
): BudgetCategoryTotal | null {
  if (!categories || categories.length === 0) return null
  const top = categories[0]
  return top.amount > 0 ? top : null
}

export function getAverageExpense(totalSpent: number, expenseCount: number): number {
  return expenseCount > 0 ? totalSpent / expenseCount : 0
}
