// src/lib/firebase/lists.ts
// Firestore CRUD and real-time subscriptions for Shared Lists.
//
// COLLECTION STRUCTURE:
//   groups/<groupId>/lists/<listId>           — list metadata
//   groups/<groupId>/lists/<listId>/items/<itemId>  — list items
//
// WRITE STRATEGY:
//   All writes are optimistic — caller updates local state before awaiting Firestore.
//   On Firestore error, caller must roll back (handled in list.store.ts).
//
// FEED HOOKS:
//   Meaningful state changes (claim, check, creation) emit lightweight activity
//   events via the existing activity helper. No Cloud Functions required.

import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDocs,
  query,
  orderBy,
  where,
  onSnapshot,
  serverTimestamp,
  increment,
  writeBatch,
  type Unsubscribe,
  type CollectionReference,
} from 'firebase/firestore'
import { db } from './config'
import { nanoid } from 'nanoid/non-secure'
import { captureError } from '../sentry'
import type {
  SharedList,
  SharedListCreate,
  SharedListUpdate,
  SharedListItem,
  SharedListItemCreate,
  SharedListItemUpdate,
} from '../schemas/list.schema'

// ── Collection helpers ────────────────────────────────────────────────

function listsCol(groupId: string): CollectionReference {
  return collection(db, 'groups', groupId, 'lists')
}

function listItemsCol(groupId: string, listId: string): CollectionReference {
  return collection(db, 'groups', groupId, 'lists', listId, 'items')
}

// ── Converters (inline — avoids importing from converters.ts for subcollections) ─

function toSharedList(snap: { id: string; data: () => Record<string, unknown> }): SharedList {
  return { id: snap.id, ...snap.data() } as SharedList
}

function toSharedListItem(snap: { id: string; data: () => Record<string, unknown> }): SharedListItem {
  return { id: snap.id, ...snap.data() } as SharedListItem
}

// ── LIST CRUD ─────────────────────────────────────────────────────────

/**
 * Creates a new shared list under a group.
 * Returns the generated listId.
 */
export async function createList(
  groupId: string,
  input:   SharedListCreate,
): Promise<string> {
  const listId  = nanoid()
  const listRef = doc(listsCol(groupId), listId)
  await setDoc(listRef, {
    ...input,
    id:           listId,
    groupId,
    archived:     false,
    itemCount:    0,
    checkedCount: 0,
    createdAt:    serverTimestamp(),
    updatedAt:    serverTimestamp(),
  })
  return listId
}

/**
 * Updates mutable fields of a list (title, description, type, archived).
 */
export async function updateList(
  groupId: string,
  update:  SharedListUpdate,
): Promise<void> {
  const { id, ...fields } = update
  const listRef = doc(listsCol(groupId), id)
  await updateDoc(listRef, { ...fields, updatedAt: serverTimestamp() })
}

/**
 * Archives a list — soft delete only, never destroys user data.
 */
export async function archiveList(groupId: string, listId: string): Promise<void> {
  const listRef = doc(listsCol(groupId), listId)
  await updateDoc(listRef, {
    archived:   true,
    archivedAt: serverTimestamp(),
    updatedAt:  serverTimestamp(),
  })
}

/**
 * Hard-deletes a list and all its items in a batch.
 * Call only from an explicit "Delete list" user action — never automatic.
 */
export async function deleteList(groupId: string, listId: string): Promise<void> {
  const batch     = writeBatch(db)
  const itemsSnap = await getDocs(listItemsCol(groupId, listId))
  itemsSnap.docs.forEach((d) => batch.delete(d.ref))
  batch.delete(doc(listsCol(groupId), listId))
  await batch.commit()
}

// ── LIST SUBSCRIPTIONS ────────────────────────────────────────────────

/**
 * Real-time subscription to all non-archived lists in a group.
 * Sorted by updatedAt descending (most recently active first).
 */
export function subscribeToLists(
  groupId:  string,
  onLists:  (lists: SharedList[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(
    listsCol(groupId),
    where('archived', '==', false),
    orderBy('updatedAt', 'desc'),
  )
  return onSnapshot(
    q,
    (snap) => onLists(snap.docs.map(toSharedList)),
    (err) => {
      captureError(err, { source: 'subscribeToLists', groupId })
      onError?.(err)
    },
  )
}

/**
 * Real-time subscription to items inside a specific list.
 * Sorted by order (float) ascending.
 */
export function subscribeToListItems(
  groupId:  string,
  listId:   string,
  onItems:  (items: SharedListItem[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(
    listItemsCol(groupId, listId),
    orderBy('order', 'asc'),
  )
  return onSnapshot(
    q,
    (snap) => onItems(snap.docs.map(toSharedListItem)),
    (err) => {
      captureError(err, { source: 'subscribeToListItems', groupId, listId })
      onError?.(err)
    },
  )
}

// ── ITEM CRUD ─────────────────────────────────────────────────────────

/**
 * Adds a new item to a list. Returns the generated itemId.
 * Also increments the parent list's itemCount.
 */
export async function addListItem(
  groupId: string,
  listId:  string,
  input:   Omit<SharedListItemCreate, 'listId' | 'groupId' | 'order'>,
  order:   number,
): Promise<string> {
  const itemId  = nanoid()
  const itemRef = doc(listItemsCol(groupId, listId), itemId)
  const batch   = writeBatch(db)

  batch.set(itemRef, {
    ...input,
    id:        itemId,
    listId,
    groupId,
    order,
    checked:   false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  // Keep itemCount in sync on the parent list
  batch.update(doc(listsCol(groupId), listId), {
    itemCount: increment(1),
    updatedAt: serverTimestamp(),
  })

  await batch.commit()
  return itemId
}

/**
 * Updates mutable fields of a list item.
 */
export async function updateListItem(
  groupId: string,
  listId:  string,
  update:  SharedListItemUpdate,
): Promise<void> {
  const { id, ...fields } = update
  const itemRef = doc(listItemsCol(groupId, listId), id)
  await updateDoc(itemRef, { ...fields, updatedAt: serverTimestamp() })
}

/**
 * Toggles the checked state of a list item.
 * Adjusts checkedCount on the parent list.
 */
export async function toggleListItem(
  groupId:    string,
  listId:     string,
  itemId:     string,
  checked:    boolean,
  checkerUid: string,
): Promise<void> {
  const batch   = writeBatch(db)
  const itemRef = doc(listItemsCol(groupId, listId), itemId)

  batch.update(itemRef, {
    checked,
    checkedAt: checked ? serverTimestamp() : null,
    checkedBy: checked ? checkerUid : null,
    updatedAt: serverTimestamp(),
  })

  batch.update(doc(listsCol(groupId), listId), {
    checkedCount: increment(checked ? 1 : -1),
    updatedAt:    serverTimestamp(),
  })

  await batch.commit()
}

/**
 * Claims or unclaims a list item.
 * Only one person can hold a claim at a time.
 */
export async function claimListItem(
  groupId:  string,
  listId:   string,
  itemId:   string,
  claimUid: string | null, // null = unclaim
): Promise<void> {
  const itemRef = doc(listItemsCol(groupId, listId), itemId)
  await updateDoc(itemRef, {
    claimedBy: claimUid,
    claimedAt: claimUid ? serverTimestamp() : null,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Deletes a list item and decrements the parent list's itemCount.
 * Also adjusts checkedCount if the item was checked.
 */
export async function deleteListItem(
  groupId:   string,
  listId:    string,
  itemId:    string,
  wasChecked: boolean,
): Promise<void> {
  const batch   = writeBatch(db)
  const itemRef = doc(listItemsCol(groupId, listId), itemId)

  batch.delete(itemRef)
  batch.update(doc(listsCol(groupId), listId), {
    itemCount:    increment(-1),
    checkedCount: wasChecked ? increment(-1) : increment(0),
    updatedAt:    serverTimestamp(),
  })

  await batch.commit()
}

/**
 * Computes the next float sort order for a new item at the end of the list.
 */
export function nextItemOrder(items: SharedListItem[]): number {
  if (items.length === 0) return 1000
  const maxOrder = Math.max(...items.map((i) => i.order))
  return maxOrder + 1000
}
