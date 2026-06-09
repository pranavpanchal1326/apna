// src/lib/engine/settlementEngine.ts
// Dhaga Settlement Engine — simplify-debts algorithm
// All amounts in INTEGER PAISE (₹1 = 100 paise). Never floats.
//
// ALGORITHM: Greedy min-cash-flow
//   1. Compute net balance for each member (totalPaid - totalOwed)
//   2. Split into creditors (net > 0) and debtors (net < 0)
//   3. Greedily match largest creditor with largest debtor
//   4. Repeat until all balances are zero
//
// GUARANTEES:
//   - Transactions ≤ (n - 1) where n = number of members with nonzero balance
//   - 5-person circular debt → max 4 transactions
//   - Total paise in = total paise out (conservation check)
//   - No transaction < 1 paise (filter dust)

export interface MemberBalance {
  uid:         string
  displayName: string
  avatarColor: string
  netPaise:    number   // positive = owed money TO this person; negative = owes money
  totalPaid:   number   // paise paid across all expenses
  totalOwed:   number   // paise owed across all expenses
}

export interface Settlement {
  fromUid:     string
  toUid:       string
  fromName:    string
  toName:      string
  amountPaise: number
}

export interface ExpenseShare {
  payerUid:   string
  shares: {
    uid:        string
    amountPaise: number
  }[]
}

/**
 * Compute per-member net balances from expense shares.
 * @param expenses — array of expense share objects
 * @param members  — full member list for display names / avatar colors
 */
export function computeBalances(
  expenses:  ExpenseShare[],
  members:   { uid: string; name: string; avatarColor: string }[]
): MemberBalance[] {
  // Build lookup: uid → { totalPaid, totalOwed }
  const ledger = new Map<string, { paid: number; owed: number }>()

  // Initialise all members at zero
  for (const m of members) {
    ledger.set(m.uid, { paid: 0, owed: 0 })
  }

  for (const expense of expenses) {
    // Payer gets credit
    const payerEntry = ledger.get(expense.payerUid) ?? { paid: 0, owed: 0 }
    const totalExpensePaise = expense.shares.reduce((s, sh) => s + sh.amountPaise, 0)
    ledger.set(expense.payerUid, {
      ...payerEntry,
      paid: payerEntry.paid + totalExpensePaise,
    })

    // Each share participant owes their share
    for (const share of expense.shares) {
      const entry = ledger.get(share.uid) ?? { paid: 0, owed: 0 }
      ledger.set(share.uid, {
        ...entry,
        owed: entry.owed + share.amountPaise,
      })
    }
  }

  // Build MemberBalance array
  return members.map((m) => {
    const { paid, owed } = ledger.get(m.uid) ?? { paid: 0, owed: 0 }
    return {
      uid:         m.uid,
      displayName: m.name,
      avatarColor: m.avatarColor,
      netPaise:    paid - owed,   // positive = others owe me; negative = I owe others
      totalPaid:   paid,
      totalOwed:   owed,
    }
  })
}

/**
 * Simplify debts — minimise number of transactions using greedy min-cash-flow.
 * @param balances — output of computeBalances
 * @returns array of Settlement objects — who pays who, how much
 */
export function simplifyDebts(balances: MemberBalance[]): Settlement[] {
  // Work with mutable copies in paise
  const creditors: { uid: string; name: string; amount: number }[] = []
  const debtors:   { uid: string; name: string; amount: number }[] = []

  for (const b of balances) {
    if (b.netPaise > 1) {       // Filter dust < 1 paise
      creditors.push({ uid: b.uid, name: b.displayName, amount: b.netPaise })
    } else if (b.netPaise < -1) {
      debtors.push({ uid: b.uid, name: b.displayName, amount: -b.netPaise })  // positive
    }
  }

  const settlements: Settlement[] = []

  // CONSERVATION CHECK — paise in must equal paise out
  const totalCredit = creditors.reduce((s, c) => s + c.amount, 0)
  const totalDebt   = debtors.reduce((s, d) => s + d.amount, 0)
  const drift = Math.abs(totalCredit - totalDebt)
  const memberCount = balances.length
  if (drift > memberCount) {
    // Rounding drift > 1 paise per member = data error
    throw new Error(
      `Settlement conservation failed: credit=${totalCredit} debt=${totalDebt} drift=${drift}`
    )
  }

  // Sort descending for greedy matching
  creditors.sort((a, b) => b.amount - a.amount)
  debtors.sort((a, b) => b.amount - a.amount)

  let ci = 0  // creditor pointer
  let di = 0  // debtor pointer

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci]!
    const debtor   = debtors[di]!
    const amount   = Math.min(creditor.amount, debtor.amount)

    if (amount > 0) {
      settlements.push({
        fromUid:     debtor.uid,
        toUid:       creditor.uid,
        fromName:    debtor.name,
        toName:      creditor.name,
        amountPaise: amount,
      })
    }

    creditor.amount -= amount
    debtor.amount   -= amount

    if (creditor.amount < 2) ci++   // Creditor settled (within 1 paise dust)
    if (debtor.amount < 2)   di++   // Debtor settled
  }

  return settlements
}

/**
 * Category spend breakdown — group expenses by category, return totals in paise.
 */
export interface CategoryBreakdown {
  category:    string
  totalPaise:  number
  percentage:  number
  count:       number
}

export function categoryBreakdown(
  expenses: { category: string; amountPaise: number }[]
): CategoryBreakdown[] {
  const totals = new Map<string, { paise: number; count: number }>()

  for (const expense of expenses) {
    const existing = totals.get(expense.category) ?? { paise: 0, count: 0 }
    totals.set(expense.category, {
      paise: existing.paise + expense.amountPaise,
      count: existing.count + 1,
    })
  }

  const grandTotal = Array.from(totals.values()).reduce((s, v) => s + v.paise, 0)

  return Array.from(totals.entries())
    .map(([category, { paise, count }]) => ({
      category,
      totalPaise:  paise,
      percentage:  grandTotal > 0 ? Math.round((paise / grandTotal) * 100) : 0,
      count,
    }))
    .sort((a, b) => b.totalPaise - a.totalPaise)
}

/**
 * Budget utilisation — how much of the total budget has been spent.
 */
export interface BudgetUtilisation {
  totalBudgetPaise:  number
  totalSpentPaise:   number
  remainingPaise:    number
  percentageUsed:    number
  isOverBudget:      boolean
}

export function budgetUtilisation(
  totalBudgetRupees: number,
  expenses: { amountPaise: number }[]
): BudgetUtilisation {
  const totalBudgetPaise = Math.round(totalBudgetRupees * 100)
  const totalSpentPaise  = expenses.reduce((s, e) => s + e.amountPaise, 0)
  const remainingPaise   = totalBudgetPaise - totalSpentPaise

  return {
    totalBudgetPaise,
    totalSpentPaise,
    remainingPaise,
    percentageUsed: totalBudgetPaise > 0
      ? Math.min(Math.round((totalSpentPaise / totalBudgetPaise) * 100), 100)
      : 0,
    isOverBudget: totalSpentPaise > totalBudgetPaise,
  }
}
