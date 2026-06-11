// src/lib/firebase/hangouts.ts
// Firestore CRUD and real-time subscriptions for Hangout Planner.
//
// COLLECTION: groups/<groupId>/hangouts/<hangoutId>
//
// QUORUM AUTO-CONFIRM:
//   After every RSVP write, if yes-count >= quorumThreshold and status is
//   'proposed', the document is atomically updated to status='confirmed'.
//   This is idempotent — safe to call multiple times.
//
// FEED HOOKS:
//   Feed writes are fire-and-forget via addDoc to the activity subcollection.
//   They do not block the primary write path.

import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  addDoc,
  type Unsubscribe,
  type CollectionReference,
} from 'firebase/firestore'
import { db } from './config'
import { nanoid } from 'nanoid/non-secure'
import { captureError } from '../sentry'
import type { Hangout, HangoutCreate, HangoutUpdate, RsvpValue } from '../schemas/hangout.schema'

// ── Collection helpers ────────────────────────────────────────────────

function hangoutsCol(groupId: string): CollectionReference {
  return collection(db, 'groups', groupId, 'hangouts')
}

function activitiesCol(groupId: string): CollectionReference {
  return collection(db, 'groups', groupId, 'activity')
}

// ── Converter ─────────────────────────────────────────────────────────

function toHangout(snap: { id: string; data: () => Record<string, unknown> }): Hangout {
  return { id: snap.id, ...snap.data() } as Hangout
}

// ── CRUD ──────────────────────────────────────────────────────────────

/**
 * Creates a new hangout in the group. Returns hangoutId.
 */
export async function createHangout(
  groupId:  string,
  input:    HangoutCreate,
): Promise<string> {
  const hangoutId  = nanoid()
  const hangoutRef = doc(hangoutsCol(groupId), hangoutId)

  await setDoc(hangoutRef, {
    ...input,
    id:         hangoutId,
    groupId,
    rsvps:      {},
    yesCount:   0,
    maybeCount: 0,
    noCount:    0,
    status:     'proposed',
    proposedAt: serverTimestamp(),
    updatedAt:  serverTimestamp(),
  })

  // Feed: hangout proposed
  await _emitFeedEvent(groupId, {
    actorUid:  input.proposedBy,
    type:      'hangout_proposed',
    metadata:  { hangoutId, title: input.title, scheduledDate: input.scheduledDate },
  })

  return hangoutId
}

/**
 * Updates mutable fields of a hangout (title, time, place, budget, note).
 */
export async function updateHangout(
  groupId: string,
  update:  HangoutUpdate,
): Promise<void> {
  const { id, ...fields } = update
  const hangoutRef = doc(hangoutsCol(groupId), id)
  await updateDoc(hangoutRef, { ...fields, updatedAt: serverTimestamp() })
}

/**
 * Cancels a hangout.
 */
export async function cancelHangout(groupId: string, hangoutId: string): Promise<void> {
  const hangoutRef = doc(hangoutsCol(groupId), hangoutId)
  await updateDoc(hangoutRef, { status: 'canceled', updatedAt: serverTimestamp() })
}

// ── RSVP ──────────────────────────────────────────────────────────────

/**
 * Casts or updates an RSVP for a user.
 * Atomically recalculates yes/maybe/no counts.
 * Auto-confirms if quorum is reached.
 */
export async function castRsvp(
  groupId:         string,
  hangoutId:       string,
  uid:             string,
  newValue:        RsvpValue,
  currentHangout:  Hangout,
): Promise<void> {
  const previousValue = currentHangout.rsvps[uid]?.value ?? null

  // Recalculate denormalized counts
  let yesCount   = currentHangout.yesCount
  let maybeCount = currentHangout.maybeCount
  let noCount    = currentHangout.noCount

  // Remove old vote from counts
  if (previousValue === 'yes')   yesCount--
  if (previousValue === 'maybe') maybeCount--
  if (previousValue === 'no')    noCount--

  // Add new vote
  if (newValue === 'yes')   yesCount++
  if (newValue === 'maybe') maybeCount++
  if (newValue === 'no')    noCount++

  // Clamp to 0 to guard against stale state
  yesCount   = Math.max(0, yesCount)
  maybeCount = Math.max(0, maybeCount)
  noCount    = Math.max(0, noCount)

  const shouldConfirm =
    currentHangout.status === 'proposed' &&
    yesCount >= currentHangout.quorumThreshold

  const batch      = writeBatch(db)
  const hangoutRef = doc(hangoutsCol(groupId), hangoutId)

  batch.update(hangoutRef, {
    [`rsvps.${uid}`]: { value: newValue, votedAt: serverTimestamp() },
    yesCount,
    maybeCount,
    noCount,
    ...(shouldConfirm ? { status: 'confirmed', confirmedAt: serverTimestamp() } : {}),
    updatedAt: serverTimestamp(),
  })

  await batch.commit()

  // Feed events (fire-and-forget — do not await or block)
  _emitFeedEvent(groupId, {
    actorUid: uid,
    type:     'hangout_rsvp',
    metadata: {
      hangoutId,
      title:     currentHangout.title,
      rsvpValue: newValue,
    },
  }).catch((err) => captureError(err, { source: 'hangouts.castRsvp.feed.rsvp' }))

  if (shouldConfirm) {
    _emitFeedEvent(groupId, {
      actorUid: uid,
      type:     'hangout_confirmed',
      metadata: {
        hangoutId,
        title:    currentHangout.title,
        yesCount,
      },
    }).catch((err) => captureError(err, { source: 'hangouts.castRsvp.feed.confirm' }))
  }
}

// ── Subscriptions ─────────────────────────────────────────────────────

/**
 * Real-time subscription to all non-canceled, upcoming hangouts in a group.
 * Returns all (canceled included) — caller filters for display.
 */
export function subscribeToHangouts(
  groupId:    string,
  onHangouts: (hangouts: Hangout[]) => void,
  onError?:   (err: Error) => void,
): Unsubscribe {
  const q = query(
    hangoutsCol(groupId),
    orderBy('scheduledDate', 'asc'),
  )
  return onSnapshot(
    q,
    (snap) => onHangouts(snap.docs.map(toHangout)),
    (err) => {
      captureError(err, { source: 'subscribeToHangouts', groupId })
      onError?.(err)
    },
  )
}

/**
 * One-shot fetch of a single hangout (for detail screen pre-load).
 */
export async function fetchHangouts(groupId: string): Promise<Hangout[]> {
  const q    = query(hangoutsCol(groupId), orderBy('scheduledDate', 'asc'))
  const snap = await getDocs(q)
  return snap.docs.map(toHangout)
}

// ── Feed helper ───────────────────────────────────────────────────────

async function _emitFeedEvent(
  groupId: string,
  event: {
    actorUid: string
    type:     string
    metadata: Record<string, unknown>
  },
): Promise<void> {
  await addDoc(activitiesCol(groupId), {
    actorUid:  event.actorUid,
    type:      event.type,
    metadata:  event.metadata,
    createdAt: serverTimestamp(),
  })
}
