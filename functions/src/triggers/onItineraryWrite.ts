// functions/src/triggers/onItineraryWrite.ts
// Cloud Function (v2 Firestore Trigger, region: asia-south1):
// Writes activity feed entries when itinerary items are created.
// Maintains DayPlan.itemCount + totalEstimatedCost via atomic increments.

import { onDocumentCreated, onDocumentDeleted } from 'firebase-functions/v2/firestore'
import * as admin from 'firebase-admin'
import type { ItineraryItem } from '../../../src/lib/schemas/itinerary.schema'

const db = admin.firestore()

// ── onCreate: item added ─────────────────────────────────────────────
export const onItineraryItemCreated = onDocumentCreated(
  { document: 'groups/{groupId}/days/{dayId}/items/{itemId}', region: 'asia-south1' },
  async (event) => {
    const { groupId, dayId, itemId } = event.params
    const item = event.data?.data() as ItineraryItem | undefined
    if (!item) return

    const batch = db.batch()

    // 1. Increment DayPlan itemCount + totalEstimatedCost
    const dayRef = db.doc(`groups/${groupId}/days/${dayId}`)
    batch.update(dayRef, {
      itemCount:          admin.firestore.FieldValue.increment(1),
      totalEstimatedCost: admin.firestore.FieldValue.increment(
        item.estimatedCost ?? 0
      ),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    // 2. Write activity feed entry (collection 'activity' is singular in this project)
    const activityRef = db
      .collection(`groups/${groupId}/activity`)
      .doc()
    batch.set(activityRef, {
      id:        activityRef.id,
      type:      'trip_event',
      actorUid:  item.addedByUid,
      groupId,
      metadata: {
        title:      item.title,
        category:   item.category,
        dayId,
        itemId,
        placeId:    item.placeRef?.placeId ?? null,
        placeName:  item.placeRef?.name    ?? null,
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    await batch.commit()
  }
)

// ── onDelete: item removed ───────────────────────────────────────────
export const onItineraryItemDeleted = onDocumentDeleted(
  { document: 'groups/{groupId}/days/{dayId}/items/{itemId}', region: 'asia-south1' },
  async (event) => {
    const { groupId, dayId } = event.params
    const item = event.data?.data() as ItineraryItem | undefined
    if (!item) return

    const dayRef = db.doc(`groups/${groupId}/days/${dayId}`)
    await dayRef.update({
      itemCount:          admin.firestore.FieldValue.increment(-1),
      totalEstimatedCost: admin.firestore.FieldValue.increment(
        -(item.estimatedCost ?? 0)
      ),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
  }
)
