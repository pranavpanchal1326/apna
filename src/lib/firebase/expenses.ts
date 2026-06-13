// src/lib/firebase/expenses.ts
// All Firestore expense operations.
// Writes trigger onExpenseWrite Cloud Function → activity + balance recalc.
// Never calculate splits here — use splitEngine.ts before calling these.

import {
  addDoc,
  setDoc,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { expensesCol, expenseDoc } from './collections'
import type { ExpenseInput, ExpenseCreate } from '@lib/schemas'

export const EXPENSE_PAGE_SIZE = 30

// ── CREATE EXPENSE ─────────────────────────────────────────────────
export interface CreateExpenseParams {
  id?:          string           // Optional pre-specified ID
  groupId:      string
  description:  string
  amount:       number           // Rupees — positive value
  paidBy:       string           // uid of payer
  splitType:    'equal' | 'exact' | 'percentage'
  splits:       Record<string, number> // uid -> amount in rupees mapping
  category:     ExpenseInput['category']
  date:         string           // YYYY-MM-DD
  notes?:       string
  receiptUrl?:  string           // Set later by background upload
  createdBy:    string           // uid of creator
  uploadPending?: boolean
}

export async function createExpense(
  params: CreateExpenseParams
): Promise<string> {
  const {
    id,
    groupId,
    description,
    amount,
    paidBy,
    splitType,
    splits,
    category,
    date,
    notes,
    receiptUrl,
    createdBy,
    uploadPending,
  } = params

  const data: ExpenseCreate & { uploadPending?: boolean } = {
    groupId,
    description:  description.trim(),
    amount,
    currency:     'INR',
    paidBy,
    splitType,
    splits,
    category,
    date,
    notes:        notes?.trim() || undefined,
    receiptUrl:   receiptUrl || undefined,
    createdBy,
    isSettled:    false,
    createdAt:    serverTimestamp(),
    uploadPending: uploadPending || undefined,
  }

  if (id) {
    const ref = doc(expensesCol(groupId), id)
    await setDoc(ref, data)
    return id
  } else {
    const ref = await addDoc(expensesCol(groupId), data)
    return ref.id
  }
}

// ── UPDATE EXPENSE ─────────────────────────────────────────────────
export async function updateExpense(
  groupId:   string,
  expenseId: string,
  updates:   Partial<Omit<ExpenseCreate, 'createdAt' | 'groupId' | 'createdBy'>>
): Promise<void> {
  await updateDoc(expenseDoc(groupId, expenseId), {
    ...updates,
  })
}

// ── DELETE EXPENSE ─────────────────────────────────────────────────
// Calls deleteDoc directly so that the onExpenseDelete Cloud Function
// trigger (which is onDocumentDeleted) fires and recalculates balances correctly.
export async function deleteExpense(
  groupId:   string,
  expenseId: string
): Promise<void> {
  await deleteDoc(expenseDoc(groupId, expenseId))
}

// ── FETCH SINGLE EXPENSE ───────────────────────────────────────────
export async function fetchExpense(
  groupId:   string,
  expenseId: string
): Promise<ExpenseInput | null> {
  const snap = await getDoc(expenseDoc(groupId, expenseId))
  if (!snap.exists()) return null
  return { ...snap.data(), id: snap.id } as ExpenseInput
}

// ── FETCH EXPENSE PAGE ─────────────────────────────────────────────
export async function fetchExpensePage(
  groupId:  string,
  lastDoc?: QueryDocumentSnapshot
): Promise<{ expenses: ExpenseInput[]; lastDoc: QueryDocumentSnapshot | null }> {
  const constraints = [
    orderBy('date', 'desc'),
    orderBy('createdAt', 'desc'),
    limit(EXPENSE_PAGE_SIZE),
    ...(lastDoc ? [startAfter(lastDoc)] : []),
  ]

  const q    = query(expensesCol(groupId), ...constraints)
  const snap = await getDocs(q)

  return {
    expenses: snap.docs.map((d) => ({ ...d.data(), id: d.id } as ExpenseInput)),
    lastDoc:  snap.docs[snap.docs.length - 1] ?? null,
  }
}

// ── UPDATE RECEIPT URL (called after background upload) ───────────
export async function attachReceiptURL(
  groupId:    string,
  expenseId:  string,
  receiptUrl: string
): Promise<void> {
  await updateDoc(expenseDoc(groupId, expenseId), {
    receiptUrl,
  })
}
