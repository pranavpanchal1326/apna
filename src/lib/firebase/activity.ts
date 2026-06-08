// src/lib/firebase/activity.ts
// Firestore read operations for the activity feed.
// WRITE operations live in Cloud Functions only — clients never write
// activity documents directly. This enforces feed integrity.

import {
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  onSnapshot,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore'
import { activitiesCol } from './collections'
import type { ActivityItem } from '@lib/schemas'
import { captureError } from '@lib/sentry'

export const FEED_PAGE_SIZE = 20

// ── Subscribe to real-time activity feed ─────────────────────────
// Returns an unsubscribe function. Call it in useEffect cleanup.
export function subscribeToActivityFeed(
  groupId:  string,
  onItems:  (items: ActivityItem[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(
    activitiesCol(groupId),
    orderBy('createdAt', 'desc'),
    limit(FEED_PAGE_SIZE)
  )

  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => d.data() as ActivityItem)
      onItems(items)
    },
    (err) => {
      captureError(err, { source: 'subscribeToActivityFeed', groupId })
      onError?.(err)
    }
  )
}

// ── Fetch next page (pagination) ─────────────────────────────────
export async function fetchActivityPage(
  groupId:  string,
  lastDoc?: QueryDocumentSnapshot
): Promise<{ items: ActivityItem[]; lastDoc: QueryDocumentSnapshot | null }> {
  const constraints = [
    orderBy('createdAt', 'desc'),
    limit(FEED_PAGE_SIZE),
    ...(lastDoc ? [startAfter(lastDoc)] : []),
  ]

  const q    = query(activitiesCol(groupId), ...constraints)
  const snap = await getDocs(q)

  return {
    items:   snap.docs.map((d) => d.data() as ActivityItem),
    lastDoc: snap.docs[snap.docs.length - 1] ?? null,
  }
}
