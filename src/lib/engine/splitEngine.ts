// src/lib/engine/splitEngine.ts
// Pure split calculation engine — no Firebase, no React, no side effects.
// Testable in isolation. Shared between app and Cloud Functions.
//
// RULES:
//   1. All arithmetic in integer paise (₹1 = 100 paise) — NO floating point
//   2. Split amounts must always sum EXACTLY to total
//   3. Rounding remainder always goes to the PAYER (first in paidByUid order)
//   4. Supports 3 split methods: equal | exact | percentage
//   5. Maximum 20 participants (enforced by caller)
//
// FLOATING POINT SAFETY:
//   Multiply all rupee amounts by 100 → work in paise (integers) → divide at end.
//   Example: ₹100.01 → 10001 paise. Split 3 ways: 3333 + 3333 + 3335 paise.
//   The extra paise goes to the payer. Sum = 10001 ✓

export type SplitMethod = 'equal' | 'exact' | 'percentage'

export interface SplitParticipant {
  uid:        string
  // For 'equal': not needed (calculated automatically)
  // For 'exact': exact amount this person owes in rupees
  // For 'percentage': percentage this person owes (0–100)
  value?:     number
}

export interface SplitResult {
  uid:          string
  amountPaise:  number   // Integer paise — exact, no floating point
  amountRupees: number   // amountPaise / 100 — for display only
}

export interface SplitValidation {
  isValid:  boolean
  error?:   string
  // For 'percentage': sum of all percentages (must equal 100)
  // For 'exact': sum of all exact amounts (must equal total)
  sum?:     number
}

// ── Primary split function ────────────────────────────────────────
export function calculateSplit(params: {
  totalRupees:  number             // The expense total in rupees
  paidByUid:    string             // Who paid — gets any remainder paise
  participants: SplitParticipant[] // Everyone involved
  method:       SplitMethod
}): SplitResult[] {
  const { totalRupees, paidByUid, participants, method } = params

  if (participants.length === 0) {
    throw new Error('At least one participant required.')
  }
  if (totalRupees <= 0) {
    throw new Error('Total must be greater than zero.')
  }

  // Convert total to paise (integer)
  const totalPaise = Math.round(totalRupees * 100)

  switch (method) {
    case 'equal':
      return splitEqual(totalPaise, paidByUid, participants)

    case 'exact':
      return splitExact(totalPaise, paidByUid, participants)

    case 'percentage':
      return splitPercentage(totalPaise, paidByUid, participants)

    default:
      throw new Error(`Unknown split method: ${method}`)
  }
}

// ── Equal split ────────────────────────────────────────────────────
function splitEqual(
  totalPaise:   number,
  paidByUid:    string,
  participants: SplitParticipant[]
): SplitResult[] {
  const n          = participants.length
  const basePaise  = Math.floor(totalPaise / n)
  const remainder  = totalPaise - basePaise * n

  // Sort: payer first (gets the remainder)
  const sorted = [...participants].sort((a, b) =>
    a.uid === paidByUid ? -1 : b.uid === paidByUid ? 1 : 0
  )

  return sorted.map((p, i) => {
    const paise = basePaise + (i === 0 ? remainder : 0)
    return {
      uid:          p.uid,
      amountPaise:  paise,
      amountRupees: paise / 100,
    }
  })
}

// ── Exact split ────────────────────────────────────────────────────
function splitExact(
  totalPaise:   number,
  _paidByUid:   string,
  participants: SplitParticipant[]
): SplitResult[] {
  const results: SplitResult[] = participants.map((p) => {
    const paise = Math.round((p.value ?? 0) * 100)
    return { uid: p.uid, amountPaise: paise, amountRupees: paise / 100 }
  })

  // Validate: sum must equal total
  const sum = results.reduce((s, r) => s + r.amountPaise, 0)
  if (sum !== totalPaise) {
    throw new Error(
      `Exact split sums to ₹${sum / 100} but total is ₹${totalPaise / 100}. Difference: ₹${(totalPaise - sum) / 100}`
    )
  }

  return results
}

// ── Percentage split ───────────────────────────────────────────────
function splitPercentage(
  totalPaise:   number,
  paidByUid:    string,
  participants: SplitParticipant[]
): SplitResult[] {
  // Validate percentages sum to 100
  const percentageSum = participants.reduce((s, p) => s + (p.value ?? 0), 0)
  const roundedSum    = Math.round(percentageSum * 100) / 100   // 2 decimal places

  if (Math.abs(roundedSum - 100) > 0.01) {
    throw new Error(
      `Percentages sum to ${roundedSum.toFixed(2)}% — must equal exactly 100%.`
    )
  }

  // Sort: payer first (gets remainder)
  const sorted = [...participants].sort((a, b) =>
    a.uid === paidByUid ? -1 : b.uid === paidByUid ? 1 : 0
  )

  // Calculate shares
  const shares = sorted.map((p) => ({
    uid:   p.uid,
    paise: Math.floor(totalPaise * (p.value ?? 0) / 100),
  }))

  // Distribute remainder to payer
  const allocated = shares.reduce((s, r) => s + r.paise, 0)
  const remainder = totalPaise - allocated
  if (shares.length > 0) shares[0].paise += remainder

  return shares.map((s) => ({
    uid:          s.uid,
    amountPaise:  s.paise,
    amountRupees: s.paise / 100,
  }))
}

// ── Validation helpers (used by UI for live feedback) ─────────────

export function validateSplit(params: {
  totalRupees:  number
  participants: SplitParticipant[]
  method:       SplitMethod
}): SplitValidation {
  const { totalRupees, participants, method } = params

  if (participants.length === 0) {
    return { isValid: false, error: 'Select at least one participant.' }
  }
  if (totalRupees <= 0) {
    return { isValid: false, error: 'Amount must be greater than ₹0.' }
  }

  if (method === 'exact') {
    const sum = participants.reduce((s, p) => s + (p.value ?? 0), 0)
    const roundedSum = Math.round(sum * 100) / 100
    const isValid    = Math.abs(roundedSum - totalRupees) < 0.01
    return {
      isValid,
      sum: roundedSum,
      error: isValid
        ? undefined
        : `₹${(totalRupees - roundedSum).toFixed(2)} ${totalRupees > roundedSum ? 'unassigned' : 'over by'}`,
    }
  }

  if (method === 'percentage') {
    const sum     = participants.reduce((s, p) => s + (p.value ?? 0), 0)
    const rounded = Math.round(sum * 100) / 100
    const isValid = Math.abs(rounded - 100) < 0.01
    return {
      isValid,
      sum: rounded,
      error: isValid
        ? undefined
        : `${(100 - rounded).toFixed(1)}% ${rounded > 100 ? 'over' : 'remaining'}`,
    }
  }

  // Equal — always valid if participants > 0
  return { isValid: true }
}

// ── Format split preview for display ─────────────────────────────
// Returns human-readable string: "₹333.33 each" or "by percentage"
export function splitSummaryLabel(
  totalRupees:  number,
  participants: SplitParticipant[],
  method:       SplitMethod
): string {
  if (participants.length === 0) return '—'

  switch (method) {
    case 'equal': {
      const each = totalRupees / participants.length
      return `₹${each.toFixed(2)} each`
    }
    case 'percentage':
      return 'by percentage'
    case 'exact':
      return 'custom amounts'
    default:
      return '—'
  }
}
