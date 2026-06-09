// functions/src/engine/balanceEngine.ts
// Shared pure-TS balance engine used by Cloud Functions.
// NO Firebase imports — pure logic only.
// Mirrors src/lib/engine/balanceEngine.ts (paise-based section).
//
// This is the authoritative server-side version.
// Compute netBalances from ALL expenses in Firestore, then simplify.
// Result is written back to group.balances field.

// ── Types ────────────────────────────────────────────────────────────

export interface FnExpense {
  paidBy: string
  splits: Record<string, number>   // { uid: rupeeShare } — same as client schema
  amount: number                   // total rupees
  isSettled?: boolean              // skip settled expenses
  status?: string                  // skip deleted
}

export interface FnSettlement {
  fromUid:    string
  toUid:      string
  amountPaise: number
}

export interface FnMemberBalance {
  uid:        string
  netPaise:   number
  netRupees:  number
  isPayer:    boolean   // net > 0
  isDebtor:   boolean   // net < 0
  isSettled:  boolean   // |net| <= 1 paise
}

export interface FnDebt {
  fromUid:     string
  toUid:       string
  amountPaise: number
  amountRupees: number
}

export interface FnGroupBalance {
  balances:       FnMemberBalance[]
  debts:          FnDebt[]
  totalPaise:     number
  totalRupees:    number
  isFullySettled: boolean
}

// ── Step 1: Calculate raw balances from expenses ──────────────────────
// ALL amounts stored in paise to avoid floating point drift.
// Positive netPaise: member is owed money (creditor)
// Negative netPaise: member owes money (debtor)

export function calculateNetBalances(
  expenses: FnExpense[],
  memberIds: string[],
): Record<string, number> {
  const paise: Record<string, number> = {}
  memberIds.forEach(uid => { paise[uid] = 0 })

  for (const expense of expenses) {
    if (expense.status === 'deleted') continue

    const totalPaise = Math.round(expense.amount * 100)

    // Payer receives full credit
    paise[expense.paidBy] = (paise[expense.paidBy] ?? 0) + totalPaise

    // Each participant is debited their share
    for (const [uid, share] of Object.entries(expense.splits)) {
      const sharePaise = Math.round(share * 100)
      paise[uid] = (paise[uid] ?? 0) - sharePaise
    }
  }

  return paise
}

// ── Step 2: Apply recorded settlements to raw balances ───────────────
export function applySettlements(
  netPaise: Record<string, number>,
  settlements: FnSettlement[],
): Record<string, number> {
  const adjusted = { ...netPaise }

  for (const s of settlements) {
    adjusted[s.fromUid] = (adjusted[s.fromUid] ?? 0) + s.amountPaise
    adjusted[s.toUid]   = (adjusted[s.toUid]   ?? 0) - s.amountPaise
  }

  return adjusted
}

// ── Step 3: Greedy debt simplification (min-cash-flow) ────────────────
// Produces minimum number of transactions (≤ N-1) to zero all balances.
// Handles floating dust: balances within 1 paise of zero are treated as zero.
const DUST = 1  // 1 paise = ₹0.01 — floating point tolerance

export function simplifyDebts(netPaise: Record<string, number>): FnDebt[] {
  const debts: FnDebt[] = []

  const creditors = Object.entries(netPaise)
    .filter(([, v]) => v > DUST)
    .sort(([, a], [, b]) => b - a)
    .map(([uid, v]) => ({ uid, amount: v }))

  const debtors = Object.entries(netPaise)
    .filter(([, v]) => v < -DUST)
    .sort(([, a], [, b]) => a - b)
    .map(([uid, v]) => ({ uid, amount: -v }))

  let ci = 0
  let di = 0

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci]!
    const debtor   = debtors[di]!

    const settle = Math.min(creditor.amount, debtor.amount)

    if (settle > DUST) {
      debts.push({
        fromUid:     debtor.uid,
        toUid:       creditor.uid,
        amountPaise: settle,
        amountRupees: settle / 100,
      })
    }

    creditor.amount -= settle
    debtor.amount   -= settle

    if (creditor.amount <= DUST) ci++
    if (debtor.amount   <= DUST) di++
  }

  return debts
}

// ── Step 4: Full group balance summary ────────────────────────────────
export function buildGroupBalance(
  expenses:    FnExpense[],
  memberIds:   string[],
  settlements: FnSettlement[],
): FnGroupBalance {
  const raw      = calculateNetBalances(expenses, memberIds)
  const adjusted = applySettlements(raw, settlements)
  const debts    = simplifyDebts(adjusted)

  const totalPaise = expenses
    .filter(e => e.status !== 'deleted')
    .reduce((sum, e) => sum + Math.round(e.amount * 100), 0)

  const balances: FnMemberBalance[] = Object.entries(adjusted).map(([uid, netPaise]) => ({
    uid,
    netPaise,
    netRupees:  netPaise / 100,
    isPayer:    netPaise > DUST,
    isDebtor:   netPaise < -DUST,
    isSettled:  Math.abs(netPaise) <= DUST,
  }))

  return {
    balances,
    debts,
    totalPaise,
    totalRupees:    totalPaise / 100,
    isFullySettled: debts.length === 0,
  }
}

// ── Utility: balance conservation check ──────────────────────────────
// Sum of all net balances should be ~0 (money is conserved).
// Acceptable tolerance: 1 paise per member (rounding accumulation).
export function checkConservation(
  netPaise: Record<string, number>,
): { isValid: boolean; drift: number } {
  const drift = Object.values(netPaise).reduce((s, v) => s + v, 0)
  const memberCount = Object.keys(netPaise).length
  return {
    isValid: Math.abs(drift) <= memberCount,
    drift,
  }
}
