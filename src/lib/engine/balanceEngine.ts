// src/lib/engine/balanceEngine.ts
// Pure balance calculation and debt simplification engine.
// No Firebase. No React. No side effects.
// Shared between app and Cloud Functions.
//
// ALGORITHM OVERVIEW:
// 1. calculateBalances() — from expense list, compute net balance per member
//    Positive balance = group owes this person
//    Negative balance = this person owes the group
//
// 2. simplifyDebts() — min-cash-flow algorithm
//    Reduces N*(N-1)/2 possible debts to minimum transactions
//    e.g. A→B ₹100, B→C ₹100 becomes A→C ₹100 (B eliminated)
//    O(n²) — acceptable for max 20 members
//
// 3. getMyDebts() / getOwedToMe() — filtered views for a single user
//
// ALL VALUES IN PAISE — no floating point in calculations
// Display values (amountRupees) are paise/100, for rendering only

import type { ExpenseInput } from '@lib/schemas'

// ── Types ────────────────────────────────────────────────────────────

export interface MemberBalance {
  uid: string
  // Positive: group owes this person this much (they overpaid)
  // Negative: this person owes the group this much (they underpaid)
  netPaise: number
  netRupees: number   // netPaise / 100, for display only
  isPayer: boolean    // true if netPaise > 0
  isDebtor: boolean   // true if netPaise < 0
  isSettled: boolean  // true if netPaise === 0
}

export interface DebtSimplified {
  fromUid: string   // This person OWES
  toUid: string     // This person is OWED
  amountPaise: number
  amountRupees: number  // amountPaise / 100
}

export interface GroupBalanceSummary {
  balances: MemberBalance[]          // One per member, sorted by netPaise desc
  debts: DebtSimplified[]            // Minimum transactions to settle all debts
  totalExpensesPaise: number         // Sum of all expense amounts
  totalExpensesRupees: number
  isFullySettled: boolean            // All netPaise === 0
  unsettledCount: number             // Members with non-zero balance
}

// ── Step 1: Calculate raw balances ───────────────────────────────────
// For each expense: paidBy gets credit for full amount,
// each participant gets debited for their split share.
//
// Balance(uid) = Σ(amounts paid by uid) - Σ(split shares owed by uid)

export function calculateBalances(
  expenses: ExpenseInput[],
  memberIds: string[],
): MemberBalance[] {
  // Initialize all members at 0
  const netPaiseMap = new Map<string, number>()
  for (const uid of memberIds) {
    netPaiseMap.set(uid, 0)
  }

  for (const expense of expenses) {
    // Skip deleted or settled expenses — they're already resolved
    if ((expense as any).status === 'deleted') continue

    const totalPaise = Math.round(expense.amount * 100)

    // Payer receives credit for the full amount
    const currentPayer = netPaiseMap.get(expense.paidBy) ?? 0
    netPaiseMap.set(expense.paidBy, currentPayer + totalPaise)

    // Each participant is debited their share
    for (const [uid, shareRupees] of Object.entries(expense.splits)) {
      const sharePaise = Math.round(shareRupees * 100)
      const current = netPaiseMap.get(uid) ?? 0
      netPaiseMap.set(uid, current - sharePaise)
    }
  }

  return Array.from(netPaiseMap.entries())
    .map(([uid, netPaise]) => ({
      uid,
      netPaise,
      netRupees: netPaise / 100,
      isPayer: netPaise > 0,
      isDebtor: netPaise < 0,
      isSettled: netPaise === 0,
    }))
    .sort((a, b) => b.netPaise - a.netPaise) // Creditors first
}

// ── Step 2: Apply recorded settlements to balances ───────────────────
// Recorded settlements adjust the net balances.
// fromUid's debt decreases; toUid's credit decreases.

export interface RecordedSettlement {
  fromUid: string
  toUid: string
  amountPaise: number
}

export function applySettlements(
  balances: MemberBalance[],
  settlements: RecordedSettlement[],
): MemberBalance[] {
  const netPaiseMap = new Map<string, number>(
    balances.map(b => [b.uid, b.netPaise])
  )

  for (const s of settlements) {
    // fromUid paid toUid — fromUid's debt decreases, toUid's credit decreases
    const from = netPaiseMap.get(s.fromUid) ?? 0
    const to = netPaiseMap.get(s.toUid) ?? 0
    netPaiseMap.set(s.fromUid, from + s.amountPaise)  // Debt reduces
    netPaiseMap.set(s.toUid, to - s.amountPaise)      // Credit reduces
  }

  return Array.from(netPaiseMap.entries())
    .map(([uid, netPaise]) => ({
      uid,
      netPaise,
      netRupees: netPaise / 100,
      isPayer: netPaise > 0,
      isDebtor: netPaise < 0,
      isSettled: netPaise === 0,
    }))
    .sort((a, b) => b.netPaise - a.netPaise)
}

// ── Step 3: Simplify debts — min-cash-flow algorithm ─────────────────
// Given member balances, find the minimum number of transactions
// to bring all balances to zero.
//
// Algorithm:
// 1. Separate into creditors (positive balance) and debtors (negative)
// 2. Greedily match largest creditor with largest debtor
// 3. The smaller of |creditor| and |debtor| becomes one transaction
// 4. Reduce both by that amount; repeat until all zero
//
// Complexity: O(n²) — fine for n ≤ 20 (PRD group member limit)

export function simplifyDebts(balances: MemberBalance[]): DebtSimplified[] {
  const debts: DebtSimplified[] = []

  // Work on mutable copies in paise integers
  const credits = balances
    .filter(b => b.netPaise > 0)
    .map(b => ({ uid: b.uid, paise: b.netPaise }))
    .sort((a, b) => b.paise - a.paise)  // Largest first

  const debitors = balances
    .filter(b => b.netPaise < 0)
    .map(b => ({ uid: b.uid, paise: -b.netPaise }))  // Make positive
    .sort((a, b) => b.paise - a.paise)  // Largest first

  let ci = 0  // Credit pointer
  let di = 0  // Debt pointer

  while (ci < credits.length && di < debitors.length) {
    const credit = credits[ci]
    const debt = debitors[di]

    if (credit.paise === 0) { ci++; continue }
    if (debt.paise === 0)   { di++; continue }

    const amount = Math.min(credit.paise, debt.paise)

    debts.push({
      fromUid: debt.uid,      // Debtor pays
      toUid: credit.uid,      // Creditor receives
      amountPaise: amount,
      amountRupees: amount / 100,
    })

    credit.paise -= amount
    debt.paise -= amount

    if (credit.paise === 0) ci++
    if (debt.paise === 0)   di++
  }

  return debts
}

// ── Step 4: Build complete group balance summary ──────────────────────

export function buildGroupBalanceSummary(
  expenses: ExpenseInput[],
  memberIds: string[],
  recordedSettlements: RecordedSettlement[],
): GroupBalanceSummary {
  const activeExpenses = expenses.filter(e => (e as any).status !== 'deleted')

  const rawBalances = calculateBalances(activeExpenses, memberIds)
  const adjustedBalances = applySettlements(rawBalances, recordedSettlements)
  const debts = simplifyDebts(adjustedBalances)

  const totalExpensesPaise = activeExpenses.reduce(
    (sum, e) => sum + Math.round(e.amount * 100), 0
  )

  return {
    balances: adjustedBalances,
    debts,
    totalExpensesPaise,
    totalExpensesRupees: totalExpensesPaise / 100,
    isFullySettled: adjustedBalances.every(b => b.netPaise === 0),
    unsettledCount: adjustedBalances.filter(b => b.netPaise !== 0).length,
  }
}

// ── Convenience: filtered views for a single user ────────────────────

// Debts this user needs to PAY (they owe money to someone)
export function getMyDebts(
  debts: DebtSimplified[],
  myUid: string,
): DebtSimplified[] {
  return debts.filter(d => d.fromUid === myUid)
}

// Amounts others owe TO this user
export function getOwedToMe(
  debts: DebtSimplified[],
  myUid: string,
): DebtSimplified[] {
  return debts.filter(d => d.toUid === myUid)
}

// My net balance: positive = owed to me, negative = I owe
export function getMyNetBalance(
  balances: MemberBalance[],
  myUid: string,
): MemberBalance | null {
  return balances.find(b => b.uid === myUid) ?? null
}

// Format balance for hero display: "+₹1,250" or "-₹840"
export function formatBalanceHero(netPaise: number): string {
  const abs = Math.abs(netPaise) / 100
  const formatted = abs.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
  return netPaise >= 0 ? `+₹${formatted}` : `-₹${formatted}`
}

// ── Prompt 1.5 compatible API ──────────────────────────────────────────
// These exports satisfy the balanceEngine contract from Prompt 1.5.
// They adapt the existing engine API to the paise-based splitBetween format.

export interface ExpenseForBalance {
  paidByUid:    string
  splitBetween: Array<{ uid: string; amountPaise: number }>
  status:       string   // Only 'active' expenses counted
}

export interface SimplifiedDebt {
  fromUid:      string
  toUid:        string
  amountPaise:  number
  amountRupees: number
}

export interface GroupBalances {
  netBalances:      Record<string, number>   // paise, integer
  simplifiedDebts:  SimplifiedDebt[]
  totalCirculation: number                   // paise
  isSettled:        boolean
}

export interface MemberBalanceSummary {
  uid:        string
  netPaise:   number
  netRupees:  number
  isCreditor: boolean
  isDebtor:   boolean
  isSettled:  boolean
  bilateral:  Array<{
    counterpartUid: string
    amountPaise:    number
    amountRupees:   number
  }>
}

// Main paise-based group balance calculator (Prompt 1.5 spec)
export function calculateGroupBalances(
  expenses: ExpenseForBalance[],
  memberIds: string[]
): GroupBalances {
  const netPaise: Record<string, number> = {}
  memberIds.forEach(uid => { netPaise[uid] = 0 })

  for (const expense of expenses) {
    if (expense.status !== 'active') continue

    const paidBy = expense.paidByUid
    for (const split of expense.splitBetween) {
      const { uid, amountPaise } = split

      if (uid === paidBy) continue   // Payer's own share — no net transfer

      if (netPaise[uid] === undefined)    netPaise[uid]    = 0
      if (netPaise[paidBy] === undefined) netPaise[paidBy] = 0

      netPaise[uid]    -= amountPaise   // Debtor owes more
      netPaise[paidBy] += amountPaise   // Creditor is owed more
    }
  }

  // Greedy simplification
  const simplifiedDebts = _simplifyPaiseDebts(netPaise)

  const totalCirculation = Object.values(netPaise)
    .filter(v => v > 0)
    .reduce((a, b) => a + b, 0)

  return {
    netBalances: netPaise,
    simplifiedDebts,
    totalCirculation,
    isSettled: simplifiedDebts.length === 0,
  }
}

function _simplifyPaiseDebts(netPaise: Record<string, number>): SimplifiedDebt[] {
  const result: SimplifiedDebt[] = []
  const balances = { ...netPaise }

  const creditors = Object.entries(balances)
    .filter(([, v]) => v > 1)
    .sort(([, a], [, b]) => b - a)
    .map(([uid, v]) => ({ uid, amount: v }))

  const debtors = Object.entries(balances)
    .filter(([, v]) => v < -1)
    .sort(([, a], [, b]) => a - b)
    .map(([uid, v]) => ({ uid, amount: -v }))

  let ci = 0
  let di = 0

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci]!
    const debtor   = debtors[di]!

    const settle = Math.min(creditor.amount, debtor.amount)

    if (settle > 0) {
      result.push({
        fromUid:     debtor.uid,
        toUid:       creditor.uid,
        amountPaise: settle,
        amountRupees: settle / 100,
      })
    }

    creditor.amount -= settle
    debtor.amount   -= settle

    if (creditor.amount <= 1) ci++
    if (debtor.amount   <= 1) di++
  }

  return result
}

// Per-member balance summary (Prompt 1.5 spec)
export function getMemberBalanceSummary(
  uid: string,
  groupBalances: GroupBalances
): MemberBalanceSummary {
  const net = groupBalances.netBalances[uid] ?? 0

  const bilateral = groupBalances.simplifiedDebts
    .filter(d => d.fromUid === uid || d.toUid === uid)
    .map(d => {
      if (d.fromUid === uid) {
        return {
          counterpartUid: d.toUid,
          amountPaise:    -d.amountPaise,
          amountRupees:   -(d.amountPaise / 100),
        }
      } else {
        return {
          counterpartUid: d.fromUid,
          amountPaise:    d.amountPaise,
          amountRupees:   d.amountPaise / 100,
        }
      }
    })

  return {
    uid,
    netPaise:   net,
    netRupees:  net / 100,
    isCreditor: net > 1,
    isDebtor:   net < -1,
    isSettled:  Math.abs(net) <= 1,
    bilateral,
  }
}

// Balance conservation check (Prompt 1.5 spec)
export function validateBalanceConservationStrict(
  netBalances: Record<string, number>,
  memberCount: number
): { isValid: boolean; sumPaise: number } {
  const sum = Object.values(netBalances).reduce((a, b) => a + b, 0)
  const tolerance = Math.ceil(memberCount * 0.5)
  return {
    isValid: Math.abs(sum) <= tolerance,
    sumPaise: sum,
  }
}

