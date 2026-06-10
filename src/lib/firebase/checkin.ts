// src/lib/firebase/checkin.ts
// Firebase Firestore helper for performing check-ins and recording activity events.

import { doc, updateDoc, arrayUnion, serverTimestamp, setDoc } from 'firebase/firestore'
import { itineraryItemsCol, activitiesCol } from './collections'
import { nanoid } from 'nanoid/non-secure'

export interface CheckInPayload {
  groupId: string
  userId: string
  userName: string
  placeId: string
  placeName: string
  dayId?: string         // Optional if checking in at an existing itinerary item
  itemId?: string        // Optional if checking in at an existing itinerary item
  message?: string       // Optional check-in message
}

export async function createCheckIn(payload: CheckInPayload): Promise<void> {
  const { groupId, userId, userName, placeId, placeName, dayId, itemId, message } = payload

  // 1. If it's an existing itinerary item, update it in Firestore
  if (dayId && itemId) {
    const itemRef = doc(itineraryItemsCol(groupId, dayId), itemId)
    await updateDoc(itemRef, {
      checkedInUids: arrayUnion(userId),
      completedAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
    })
  }

  // 2. Write to the group activity feed as a 'trip_event'
  const activityId = nanoid(16)
  const activityRef = doc(activitiesCol(groupId), activityId)
  
  await setDoc(activityRef, {
    id: activityId,
    actorUid: userId,
    type: 'trip_event',
    createdAt: serverTimestamp(),
    metadata: {
      title: `${userName} checked in at ${placeName}`,
      note: message || 'Checked in!',
      expenseId: itemId || placeId, // Repurpose field to store place or item ID
    },
  })
}
