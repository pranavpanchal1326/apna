// src/lib/firebase/itinerary.ts
// Firestore CRUD and real-time operations for the itinerary.
//
// WRITE STRATEGY:
//   All writes are optimistic — caller updates local state before awaiting Firestore.
//   On Firestore error, caller must roll back (handled in itinerary.store.ts).
//
// SORT ORDER:
//   sortOrder is a float (LexoRank-lite). On reorder, only the moved item's
//   sortOrder changes — not a full reindex. Rebalance if gap < threshold.
//
// OFFLINE:
//   Firestore SDK handles offline caching automatically.
//   PlaceRef snapshot ensures place data available without network.

import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from './config'
import { daysCol, itineraryItemsCol } from './collections'
import { nanoid } from 'nanoid/non-secure'
import { captureError } from '../sentry'
import type {
  DayPlan,
  DayPlanInput,
  ItineraryItem,
  ItineraryItemInput,
} from '../schemas'

// ── DAY PLAN OPERATIONS ──────────────────────────────────────────────

// Fetch all day plans for a group — returns sorted by date
export async function fetchDayPlans(groupId: string): Promise<DayPlan[]> {
  const q = query(daysCol(groupId), orderBy('date', 'asc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as DayPlan))
}

// Subscribe to day plans — real-time
export function subscribeToDayPlans(
  groupId:  string,
  onPlans:  (plans: DayPlan[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(daysCol(groupId), orderBy('date', 'asc'))
  return onSnapshot(
    q,
    snap => onPlans(snap.docs.map(d => ({ id: d.id, ...d.data() } as DayPlan))),
    err => {
      captureError(err, { source: 'subscribeToDayPlans', groupId })
      onError?.(err)
    },
  )
}

// Create or update a day plan
// dayId === date string "YYYY-MM-DD" — idempotent (setDoc with merge)
export async function upsertDayPlan(
  groupId: string,
  input:   DayPlanInput,
): Promise<string> {
  const dayId = input.date  // "YYYY-MM-DD"
  const ref   = doc(daysCol(groupId), dayId)

  await setDoc(ref, {
    ...input,
    id:        dayId,
    groupId,
    itemCount: 0,
    totalEstimatedCost: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true })  // merge: true — preserves itemCount if day exists

  return dayId
}

// ── ITINERARY ITEM OPERATIONS ────────────────────────────────────────

// Fetch all items for a day — sorted by sortOrder
export async function fetchDayItems(
  groupId: string,
  dayId:   string,
): Promise<ItineraryItem[]> {
  const q = query(
    itineraryItemsCol(groupId, dayId),
    orderBy('sortOrder', 'asc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as ItineraryItem))
}

// Subscribe to items for a day — real-time
export function subscribeToDayItems(
  groupId:  string,
  dayId:    string,
  onItems:  (items: ItineraryItem[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(
    itineraryItemsCol(groupId, dayId),
    orderBy('sortOrder', 'asc'),
  )
  return onSnapshot(
    q,
    snap => onItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as ItineraryItem))),
    err => {
      captureError(err, { source: 'subscribeToDayItems', groupId, dayId })
      onError?.(err)
    },
  )
}

// Add item to a day
export async function addItineraryItem(
  groupId: string,
  dayId:   string,
  input:   Omit<ItineraryItemInput, 'id' | 'dayId' | 'groupId' | 'addedByUid'>,
  addedByUid: string,
): Promise<string> {
  const itemId = nanoid(12)
  const ref    = doc(itineraryItemsCol(groupId, dayId), itemId)

  await setDoc(ref, {
    ...input,
    id:          itemId,
    dayId,
    groupId,
    addedByUid,
    linkedExpenseIds: input.linkedExpenseIds ?? [],
    votes:       input.votes ?? { up: [], down: [] },
    isConfirmed: input.isConfirmed ?? false,
    createdAt:   serverTimestamp(),
    updatedAt:   serverTimestamp(),
  })

  return itemId
}

// Update item (partial — only changed fields)
export async function updateItineraryItem(
  groupId:  string,
  dayId:    string,
  itemId:   string,
  updates:  Partial<Omit<ItineraryItem, 'id' | 'dayId' | 'groupId' | 'createdAt' | 'addedByUid'>>,
): Promise<void> {
  const ref = doc(itineraryItemsCol(groupId, dayId), itemId)
  await updateDoc(ref, {
    ...updates,
    updatedAt: serverTimestamp(),
  })
}

// Delete item
export async function deleteItineraryItem(
  groupId: string,
  dayId:   string,
  itemId:  string,
): Promise<void> {
  const ref = doc(itineraryItemsCol(groupId, dayId), itemId)
  await deleteDoc(ref)  // Items ARE hard-deleted — itinerary ≠ financial data
}

// Reorder items — batch write all sortOrders in one transaction
// Called after drag-reorder completes. Only changes sortOrder field.
export async function reorderItems(
  groupId: string,
  dayId:   string,
  orderedItemIds: string[],   // All item IDs in new order
  sortOrders:     number[],   // Corresponding new sortOrder values (must match length)
): Promise<void> {
  if (orderedItemIds.length !== sortOrders.length) {
    throw new Error('orderedItemIds and sortOrders must have equal length.')
  }

  const batch = writeBatch(db)
  orderedItemIds.forEach((itemId, i) => {
    const ref = doc(itineraryItemsCol(groupId, dayId), itemId)
    batch.update(ref, { sortOrder: sortOrders[i], updatedAt: serverTimestamp() })
  })

  await batch.commit()
}

// Move item to a different day
export async function moveItemToDay(
  groupId:    string,
  fromDayId:  string,
  toDayId:    string,
  item:       ItineraryItem,
  newSortOrder: number,
): Promise<void> {
  const batch = writeBatch(db)

  // Delete from source day
  const oldRef = doc(itineraryItemsCol(groupId, fromDayId), item.id)
  batch.delete(oldRef)

  // Add to destination day with updated dayId + sortOrder
  const newRef = doc(itineraryItemsCol(groupId, toDayId), item.id)
  batch.set(newRef, {
    ...item,
    dayId:     toDayId,
    sortOrder: newSortOrder,
    updatedAt: serverTimestamp(),
  })

  await batch.commit()
}

// Vote on a tentative item (toggle up/down)
export async function voteOnItem(
  groupId: string,
  dayId:   string,
  itemId:  string,
  uid:     string,
  vote:    'up' | 'down',
): Promise<void> {
  const ref = doc(itineraryItemsCol(groupId, dayId), itemId)
  // Use arrayUnion/arrayRemove for atomic toggle
  const { arrayUnion, arrayRemove } = await import('firebase/firestore')
  const opposite = vote === 'up' ? 'down' : 'up'

  await updateDoc(ref, {
    [`votes.${vote}`]:      arrayUnion(uid),
    [`votes.${opposite}`]:  arrayRemove(uid),
    updatedAt: serverTimestamp(),
  })
}
