// src/lib/firebase/recurringExpenses.ts
// Firestore operations for recurring expense templates.

import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  type CollectionReference,
  type DocumentReference,
  type Unsubscribe,
} from 'firebase/firestore'
import { nanoid } from 'nanoid/non-secure'
import { db } from './config'
import type { RecurringExpenseInput, RecurringExpenseCreate } from '@lib/schemas'

export const recurringExpensesCol = (groupId: string): CollectionReference =>
  collection(db, 'groups', groupId, 'recurringExpenses')

export const recurringExpenseDoc = (groupId: string, templateId: string): DocumentReference =>
  doc(db, 'groups', groupId, 'recurringExpenses', templateId)

/** Creates a recurring template. Returns the new template id. */
export async function addRecurringExpense(
  groupId: string,
  input: Omit<RecurringExpenseCreate, 'createdAt' | 'groupId'>,
): Promise<string> {
  const id = nanoid()
  await setDoc(recurringExpenseDoc(groupId, id), {
    ...input,
    id,
    groupId,
    createdAt: serverTimestamp(),
  })
  return id
}

/** Pause / resume a recurring template. */
export async function setRecurringExpenseActive(
  groupId: string,
  templateId: string,
  active: boolean,
): Promise<void> {
  await updateDoc(recurringExpenseDoc(groupId, templateId), { active })
}

/** Deletes a template. Already-generated expenses are untouched. */
export async function deleteRecurringExpense(groupId: string, templateId: string): Promise<void> {
  await deleteDoc(recurringExpenseDoc(groupId, templateId))
}

/** Real-time subscription to a group's recurring templates. */
export function subscribeToRecurringExpenses(
  groupId: string,
  onUpdate: (templates: RecurringExpenseInput[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(recurringExpensesCol(groupId), orderBy('nextRunDate', 'asc'))
  return onSnapshot(
    q,
    (snap) => {
      onUpdate(snap.docs.map((d) => ({ ...(d.data() as RecurringExpenseInput), id: d.id })))
    },
    (err) => {
      console.error(`[Firebase] error subscribing to recurring expenses for group ${groupId}:`, err)
      onError?.(err)
    },
  )
}
