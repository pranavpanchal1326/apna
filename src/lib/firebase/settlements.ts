// src/lib/firebase/settlements.ts
// Firestore settlement operations.
// Settlements are IMMUTABLE once written — security rules enforce this.
// A settlement records a manual payment between two members.
// It does NOT mark individual expenses as settled.
// Balance recalculation in balanceEngine.ts applies settlements
// on top of expense splits to arrive at current net balances.

import {
  addDoc,
  getDocs,
  query,
  orderBy,
  where,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore'
import { settlementsCol } from './collections'

export interface SettlementRecord {
  id: string
  groupId: string
  fromUid: string         // Who paid
  toUid: string           // Who received
  amountRupees: number    // Exact rupee amount
  amountPaise: number     // amountRupees * 100 — stored for calculations
  currency: string        // 'INR'
  note?: string           // Optional note, max 100 chars
  expenseIds: string[]    // Expense IDs this settlement covers (informational)
  createdAt: Timestamp
  createdBy: string       // Must match fromUid — enforced by security rules
}

export interface RecordSettlementParams {
  groupId: string
  fromUid: string
  toUid: string
  amountRupees: number
  currency?: string
  note?: string
  expenseIds?: string[]
}

// RECORD SETTLEMENT
// Immutable write — security rules deny update/delete
export async function recordSettlement(
  params: RecordSettlementParams,
): Promise<string> {
  const {
    groupId,
    fromUid,
    toUid,
    amountRupees,
    currency = 'INR',
    note,
    expenseIds = [],
  } = params

  if (amountRupees <= 0) {
    throw new Error('Settlement amount must be greater than zero.')
  }
  if (fromUid === toUid) {
    throw new Error('Cannot settle with yourself.')
  }

  const data = {
    groupId,
    fromUid,
    toUid,
    amountRupees,
    amountPaise: Math.round(amountRupees * 100),
    currency,
    note: note?.trim() ?? null,
    expenseIds,
    createdAt: serverTimestamp(),
    createdBy: fromUid,
  }

  const ref = await addDoc(settlementsCol(groupId), data)
  return ref.id
}

// FETCH SETTLEMENTS FOR GROUP
// Returns all settlements, ordered by most recent first.
export async function fetchGroupSettlements(
  groupId: string,
): Promise<SettlementRecord[]> {
  const q = query(
    settlementsCol(groupId),
    orderBy('createdAt', 'desc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({
    id: d.id,
    ...d.data(),
  } as SettlementRecord))
}

// FETCH SETTLEMENTS BETWEEN TWO MEMBERS
// Used in BalanceSummaryScreen to show history between a pair.
export async function fetchSettlementsBetween(
  groupId: string,
  uid1: string,
  uid2: string,
): Promise<SettlementRecord[]> {
  // Firestore can't do OR queries across fields in one query.
  // Fetch both directions and merge.
  const [q1Snap, q2Snap] = await Promise.all([
    getDocs(query(
      settlementsCol(groupId),
      where('fromUid', '==', uid1),
      where('toUid', '==', uid2),
      orderBy('createdAt', 'desc'),
    )),
    getDocs(query(
      settlementsCol(groupId),
      where('fromUid', '==', uid2),
      where('toUid', '==', uid1),
      orderBy('createdAt', 'desc'),
    )),
  ])

  const all = [
    ...q1Snap.docs.map(d => ({ id: d.id, ...d.data() } as SettlementRecord)),
    ...q2Snap.docs.map(d => ({ id: d.id, ...d.data() } as SettlementRecord)),
  ]

  return all.sort(
    (a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()
  )
}

// ── Prompt 1.5 Contract Compatibility ──────────────────────────────

export interface CreateSettlementParams {
  groupId:    string
  fromUid:    string
  toUid:      string
  amount:     number
  currency:   string
  expenseIds?: string[]
}

export interface SettlementInput {
  id:         string
  fromUid:    string
  toUid:      string
  amount:     number
  currency:   string
  createdAt:  unknown
  expenseIds: string[]
}

export async function createSettlement(
  params: CreateSettlementParams,
): Promise<{ settlementId: string }> {
  const settlementId = await recordSettlement({
    groupId:      params.groupId,
    fromUid:      params.fromUid,
    toUid:        params.toUid,
    amountRupees: params.amount,
    currency:     params.currency,
    expenseIds:   params.expenseIds,
  })
  return { settlementId }
}

export async function fetchSettlements(
  groupId: string,
): Promise<SettlementInput[]> {
  const records = await fetchGroupSettlements(groupId)
  return records.map((r) => ({
    id:         r.id,
    fromUid:    r.fromUid,
    toUid:      r.toUid,
    amount:     r.amountRupees,
    currency:   r.currency,
    createdAt:  r.createdAt,
    expenseIds: r.expenseIds,
  }))
}

export interface SettlementDoc {
  groupId:      string
  computedAt:   any
  balances:     BalanceItem[]
  settlements:  SettlementItem[]
  categories:   CategoryItem[]
  budget:       BudgetItem | null
  expenseCount: number
  memberCount:  number
}

export interface BalanceItem {
  uid:         string
  displayName: string
  avatarColor: string
  netPaise:    number
  totalPaid:   number
  totalOwed:   number
}

export interface SettlementItem {
  fromUid:     string
  toUid:       string
  fromName:    string
  toName:      string
  amountPaise: number
  status:      'pending' | 'recorded'
  recordedAt?: any
  recordedBy?: string
}

export interface CategoryItem {
  category:   string
  totalPaise: number
  percentage: number
  count:      number
}

export interface BudgetItem {
  totalBudgetPaise:  number
  totalSpentPaise:   number
  remainingPaise:    number
  percentageUsed:    number
  isOverBudget:      boolean
}

import { doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { db } from './config'
import { captureError } from '@lib/sentry'

export function subscribeToSettlements(
  groupId:  string,
  onChange: (data: SettlementDoc | null) => void,
  onError:  (err: Error) => void
) {
  const ref = doc(db, `groups/${groupId}/settlements/latest`)
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onChange(null)
        return
      }
      onChange(snap.data() as SettlementDoc)
    },
    (err) => {
      captureError(err, { context: 'subscribeToSettlements', groupId })
      onError(err)
    }
  )
}

export interface RecordPaymentParams {
  groupId:    string
  fromUid:    string
  toUid:      string
  recordedBy: string
}

export async function recordPayment(params: RecordPaymentParams): Promise<void> {
  const { groupId, fromUid, toUid, recordedBy } = params
  const ref = doc(db, `groups/${groupId}/settlements/latest`)

  const snap = await (await import('firebase/firestore')).getDoc(ref)
  if (!snap.exists()) throw new Error('No settlement data found.')

  const data = snap.data() as SettlementDoc
  const updatedSettlements = data.settlements.map((s) => {
    if (s.fromUid === fromUid && s.toUid === toUid && s.status === 'pending') {
      return {
        ...s,
        status:     'recorded' as const,
        recordedAt: serverTimestamp(),
        recordedBy,
      }
    }
    return s
  })

  await updateDoc(ref, { settlements: updatedSettlements })
}
