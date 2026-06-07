// src/lib/firebase/collections.ts
// Typed Firestore collection references.
// RULE: Every collection/doc reference in the app must come from this file.
// Never call collection(db, 'groups') directly in screens or hooks.
// This ensures: consistent typing, easy path changes, converter applied everywhere.

import {
  collection,
  doc,
  type CollectionReference,
  type DocumentReference,
} from 'firebase/firestore'
import { db } from './config'
import {
  userConverter,
  groupConverter,
  expenseConverter,
  itineraryConverter,
  memoryConverter,
} from './converters'
import type {
  UserInput,
  GroupInput,
  ExpenseInput,
  ItineraryItemInput,
  MemoryInput,
} from '@lib/schemas'

// ── Top-level collections ─────────────────────────────────────────
export const usersCol = (): CollectionReference<UserInput> =>
  collection(db, 'users').withConverter(userConverter)

export const groupsCol = (): CollectionReference<GroupInput> =>
  collection(db, 'groups').withConverter(groupConverter)

export const invitesCol = () =>
  collection(db, 'invites')

// ── Document refs ─────────────────────────────────────────────────
export const userDoc = (uid: string): DocumentReference<UserInput> =>
  doc(db, 'users', uid).withConverter(userConverter)

export const groupDoc = (groupId: string): DocumentReference<GroupInput> =>
  doc(db, 'groups', groupId).withConverter(groupConverter)

export const inviteDoc = (inviteCode: string) =>
  doc(db, 'invites', inviteCode)

// ── Subcollections ────────────────────────────────────────────────
export const expensesCol = (groupId: string): CollectionReference<ExpenseInput> =>
  collection(db, 'groups', groupId, 'expenses').withConverter(expenseConverter)

export const activityCol = (groupId: string) =>
  collection(db, 'groups', groupId, 'activity')

export const itineraryCol = (groupId: string): CollectionReference<ItineraryItemInput> =>
  collection(db, 'groups', groupId, 'itinerary').withConverter(itineraryConverter)

export const memoriesCol = (groupId: string): CollectionReference<MemoryInput> =>
  collection(db, 'groups', groupId, 'memories').withConverter(memoryConverter)

export const settlementsCol = (groupId: string) =>
  collection(db, 'groups', groupId, 'settlements')

// ── Subcollection document refs ───────────────────────────────────
export const expenseDoc = (groupId: string, expenseId: string): DocumentReference<ExpenseInput> =>
  doc(db, 'groups', groupId, 'expenses', expenseId).withConverter(expenseConverter)

export const itineraryItemDoc = (groupId: string, itemId: string): DocumentReference<ItineraryItemInput> =>
  doc(db, 'groups', groupId, 'itinerary', itemId).withConverter(itineraryConverter)

export const memoryDoc = (groupId: string, memoryId: string): DocumentReference<MemoryInput> =>
  doc(db, 'groups', groupId, 'memories', memoryId).withConverter(memoryConverter)
