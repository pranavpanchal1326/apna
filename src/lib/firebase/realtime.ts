// src/lib/firebase/realtime.ts
// Firebase operations for Location Sharing, Privacy Exclusions, and SOS Emergency.

import { ref, set } from 'firebase/database'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { rtdb, db, functions } from './config'
import type { LocationUpdate, GroupLocationVisibility } from '../types/location.types'

/**
 * Pushes the current user's location to Realtime Database.
 */
export async function updateMemberLocation(
  groupId: string,
  userId: string,
  coords: { lat: number; lng: number; accuracy: number },
  sharing: boolean
): Promise<void> {
  const locRef = ref(rtdb, `groups/${groupId}/locations/${userId}`)
  const update: LocationUpdate = {
    lat: coords.lat,
    lng: coords.lng,
    accuracy: coords.accuracy,
    timestamp: Date.now(),
    sharing,
  }
  await set(locRef, update)
}

/**
 * Fetches the user's location privacy exclusion settings for a group.
 */
export async function fetchPrivacyPreferences(
  userId: string,
  groupId: string
): Promise<GroupLocationVisibility | null> {
  try {
    const prefRef = doc(db, 'users', userId, 'locationPrivacy', groupId)
    const snap = await getDoc(prefRef)
    if (snap.exists()) {
      return snap.data() as GroupLocationVisibility
    }
  } catch (err) {
    console.error(`[Firebase] Error fetching privacy preferences for user ${userId}`, err)
  }
  return null
}

/**
 * Saves the user's location privacy exclusion settings for a group.
 */
export async function savePrivacyPreferences(
  userId: string,
  groupId: string,
  preferences: Omit<GroupLocationVisibility, 'updatedAt'>
): Promise<void> {
  const prefRef = doc(db, 'users', userId, 'locationPrivacy', groupId)
  await setDoc(prefRef, {
    ...preferences,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Triggers a one-off SOS broadcast.
 * Writes a public live location to RTDB (bypassing Ghost mode)
 * and invokes the SOS Callable Cloud Function to notify group members.
 */
export async function triggerSOSEvent(
  groupId: string,
  userId: string,
  coords: { lat: number; lng: number; accuracy: number }
): Promise<void> {
  // 1. Write one-time public location update
  const locRef = ref(rtdb, `groups/${groupId}/locations/${userId}`)
  const update: LocationUpdate = {
    lat: coords.lat,
    lng: coords.lng,
    accuracy: coords.accuracy,
    timestamp: Date.now(),
    sharing: true, // Safety override: must share
  }
  await set(locRef, update)

  // 2. Call the backend SOS notification function
  const onSOSTriggered = httpsCallable(functions, 'onSOSTriggered')
  await onSOSTriggered({ groupId })
}
