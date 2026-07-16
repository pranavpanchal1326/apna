// src/lib/engine/splitSuggestions.ts
// Phase 7.3 — Best-split suggestions. Pure algorithm, no AI, no network.
// Answers "who should pay this time?" from recent payment history:
// e.g. "Arjun paid the last 3 times — maybe someone else's turn?"

export interface PaidExpense {
  paidBy: string
  amount: number
  /** Millis — used to order "last paid" streaks. */
  createdAtMillis: number
}

export interface SplitSuggestion {
  suggestedPayerUid: string
  reason: 'streak' | 'least_paid' | 'never_paid'
  /** Human-readable explanation, personalised by the caller with names. */
  streakPayerUid?: string
  streakCount?: number
}

/** Consecutive same-payer count at the head of the (newest-first) list. */
export function paymentStreak(expenses: PaidExpense[]): { uid: string; count: number } | null {
  if (expenses.length === 0) return null
  const sorted = [...expenses].sort((a, b) => b.createdAtMillis - a.createdAtMillis)
  const uid = sorted[0].paidBy
  let count = 0
  for (const expense of sorted) {
    if (expense.paidBy !== uid) break
    count++
  }
  return { uid, count }
}

/** Total paid per member (members with no expenses count as 0). */
export function totalsPaidByMember(
  expenses: PaidExpense[],
  memberIds: string[],
): Map<string, number> {
  const totals = new Map<string, number>(memberIds.map((uid) => [uid, 0]))
  for (const expense of expenses) {
    if (!totals.has(expense.paidBy)) continue // ex-members' history is ignored
    totals.set(expense.paidBy, (totals.get(expense.paidBy) ?? 0) + expense.amount)
  }
  return totals
}

/**
 * Suggests who should pay the next expense.
 * Returns null when there's nothing useful to say (solo groups, no history).
 */
export function suggestNextPayer(
  expenses: PaidExpense[],
  memberIds: string[],
): SplitSuggestion | null {
  if (memberIds.length < 2) return null

  const totals = totalsPaidByMember(expenses, memberIds)

  // Least-paid member is the base suggestion
  let leastUid = memberIds[0]
  let leastTotal = Number.POSITIVE_INFINITY
  for (const uid of memberIds) {
    const total = totals.get(uid) ?? 0
    if (total < leastTotal) {
      leastUid = uid
      leastTotal = total
    }
  }

  if (expenses.length === 0) return null

  // A 3+ streak by someone else is the most compelling framing
  const streak = paymentStreak(expenses)
  if (streak && streak.count >= 3 && streak.uid !== leastUid) {
    return {
      suggestedPayerUid: leastUid,
      reason: 'streak',
      streakPayerUid: streak.uid,
      streakCount: streak.count,
    }
  }

  if (leastTotal === 0) {
    return { suggestedPayerUid: leastUid, reason: 'never_paid' }
  }
  return { suggestedPayerUid: leastUid, reason: 'least_paid' }
}
