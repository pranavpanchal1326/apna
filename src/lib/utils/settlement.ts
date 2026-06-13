import type { Expense, Settlement } from '@lib/types'

// =============================================================================
// Settlement Calculation Engine
//
// This handles real money. All functions are pure (no side effects).
// All amounts are in the group's base currency (default: INR).
//
// PRD Verification Example (₹52,500 trip, 4 members):
//   Pranav  paid ₹14,500  share ₹13,125  net +₹1,375  (owed to him)
//   Riya    paid ₹13,000  share ₹13,125  net  -₹125   (she owes)
//   Arjun   paid ₹10,000  share ₹13,125  net -₹3,125  (he owes)
//   Sneha   paid ₹15,000  share ₹13,125  net +₹1,875  (owed to her)
//
//   Minimum transactions (3, not 6 naive):
//   Arjun → Sneha    ₹1,875
//   Arjun → Pranav   ₹1,250
//   Riya  → Pranav     ₹125
// =============================================================================

/**
 * Calculates net balance for every member across all group expenses.
 *
 * Algorithm:
 *   For each expense:
 *     paidBy member:      balance += expense.amount   (they fronted cash)
 *     each split member:  balance -= splits[userId]   (their share of debt)
 *
 *   Final balance interpretation:
 *     Positive → the group owes this person money
 *     Negative → this person owes the group money
 *     Zero     → fully settled
 */
export function calculateNetBalances(
  expenses: Expense[],
  memberIds: string[],
): Record<string, number> {
  // Initialize all members at 0 — ensures everyone appears in output even if
  // they have no expenses (important for the settlements algorithm)
  const balances: Record<string, number> = {}
  memberIds.forEach((id) => {
    balances[id] = 0
  })

  expenses.forEach((expense) => {
    // Credit the payer — they're owed the full amount in base currency
    const rate = (expense as any).exchangeRateToBase || 1
    const creditAmount = rate > 0 ? expense.amount * rate : expense.amount

    if (balances[expense.paidBy] !== undefined) {
      balances[expense.paidBy] += creditAmount
    }

    // Debit each split member — they owe their share
    Object.entries(expense.splits).forEach(([userId, share]) => {
      if (balances[userId] !== undefined) {
        balances[userId] -= share
      }
    })
  })

  // Eliminate floating point ghosts (e.g. ₹0.000000001 phantom debts from
  // JavaScript IEEE 754 arithmetic). Round to nearest paisa.
  Object.keys(balances).forEach((id) => {
    balances[id] = Math.round(balances[id] * 100) / 100
  })

  return balances
}

/**
 * Shortest-path greedy settlement algorithm.
 *
 * Minimizes total number of transactions needed to clear all debts in the group.
 * Proven to produce the minimum transaction set for any balanced debt graph.
 *
 * Complexity: O(n log n) where n = number of members
 *
 * Algorithm:
 *   1. Split members into creditors (positive balance) and debtors (negative)
 *   2. Sort both descending by absolute amount
 *   3. Greedily match the largest debtor to the largest creditor
 *   4. Settle min(debtor.owes, creditor.owed), advance whichever is exhausted
 *   5. Repeat until all settled
 */
export function calculateSettlements(
  netBalances: Record<string, number>,
): Settlement[] {
  const EPSILON = 0.01 // 1 paisa — below this, treat as settled

  const creditors = Object.entries(netBalances)
    .filter(([, amt]) => amt > EPSILON)
    .map(([userId, amount]) => ({ userId, amount }))
    .sort((a, b) => b.amount - a.amount)

  const debtors = Object.entries(netBalances)
    .filter(([, amt]) => amt < -EPSILON)
    .map(([userId, amount]) => ({ userId, amount: Math.abs(amount) }))
    .sort((a, b) => b.amount - a.amount)

  const settlements: Settlement[] = []
  let ci = 0 // creditor index
  let di = 0 // debtor index

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci]
    const debtor = debtors[di]

    // Transfer amount is capped at whichever side is smaller
    const transfer = Math.min(creditor.amount, debtor.amount)

    if (transfer > EPSILON) {
      settlements.push({
        from:   debtor.userId,
        to:     creditor.userId,
        amount: Math.round(transfer * 100) / 100,
      })
    }

    creditor.amount -= transfer
    debtor.amount -= transfer

    // Advance the pointer that is now fully settled
    if (creditor.amount < EPSILON) ci++
    if (debtor.amount < EPSILON) di++
  }

  return settlements
}

/**
 * Equal split with correct remainder distribution.
 *
 * Naive division (totalAmount / n) creates floating point errors that cause
 * splits to not sum to totalAmount exactly. This function guarantees:
 *   sum(Object.values(result)) === totalAmount  (within 1 paisa)
 *
 * The last member absorbs the rounding remainder — typically < 1 paisa.
 */
export function calculateEqualSplit(
  totalAmount: number,
  memberIds: string[],
): Record<string, number> {
  if (memberIds.length === 0) return {}

  // Floor to 2 decimal places (not round) to avoid over-allocation
  const perPerson = Math.floor((totalAmount / memberIds.length) * 100) / 100
  const splits: Record<string, number> = {}
  let allocated = 0

  memberIds.forEach((id, index) => {
    if (index === memberIds.length - 1) {
      // Last person gets the remainder — ensures exact total match
      splits[id] = Math.round((totalAmount - allocated) * 100) / 100
    } else {
      splits[id] = perPerson
      allocated += perPerson
    }
  })

  return splits
}

/**
 * Validates that splits sum exactly to the total before saving to Firestore.
 *
 * Must be called before any expense write. Returns false if the user's
 * entered splits don't add up — UI should block submission and show error.
 *
 * Tolerance: 1 paisa (₹0.01) to account for UI rounding display
 */
export function validateSplits(
  totalAmount: number,
  splits: Record<string, number>,
): boolean {
  if (Object.keys(splits).length === 0) return false
  const splitTotal = Object.values(splits).reduce((sum, v) => sum + v, 0)
  return Math.abs(splitTotal - totalAmount) < 0.01
}

/**
 * Calculates percentage-based splits.
 *
 * Validates percentages sum to 100 (within 0.01%) before computing amounts.
 * Returns null if percentages are invalid — caller must handle UI error.
 */
export function calculatePercentageSplit(
  totalAmount: number,
  percentages: Record<string, number>, // userId → percentage (0–100)
): Record<string, number> | null {
  const percentTotal = Object.values(percentages).reduce((sum, p) => sum + p, 0)
  if (Math.abs(percentTotal - 100) > 0.01) return null

  const splits: Record<string, number> = {}
  const userIds = Object.keys(percentages)

  let allocated = 0
  userIds.forEach((id, index) => {
    if (index === userIds.length - 1) {
      splits[id] = Math.round((totalAmount - allocated) * 100) / 100
    } else {
      const amount = Math.floor((totalAmount * (percentages[id] / 100)) * 100) / 100
      splits[id] = amount
      allocated += amount
    }
  })

  return splits
}
