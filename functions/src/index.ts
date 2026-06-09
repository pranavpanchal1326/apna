import * as admin from 'firebase-admin'
import {
  onDocumentCreated,
  onDocumentDeleted,
  onDocumentUpdated,
} from 'firebase-functions/v2/firestore'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'

admin.initializeApp()

import {
  recalculateGroupBalances,
  writeExpenseCreatedActivity,
  writeExpenseDeletedActivity,
} from './triggers/onExpenseWrite'

// =============================================================================
// apna Cloud Functions — Skeleton (7 stubs)
// ALL functions pinned to asia-south1 (Mumbai) for Indian user latency.
// Using firebase-functions v2 API (functions package v6).
// =============================================================================

// ── Expense Triggers ──────────────────────────────────────────────────────────

/**
 * Triggered when a new expense is added to any group.
 * TODO Prompt 1.3:
 *   1. Recalculate /groups/{groupId}/balances using settlement engine
 *   2. Write feed item: expense_added
 *   3. Send FCM push to all group members except paidBy
 */
export const onExpenseCreate = onDocumentCreated(
  { document: 'groups/{groupId}/expenses/{expenseId}', region: 'asia-south1' },
  async (event) => {
    const { groupId, expenseId } = event.params
    const expense = event.data?.data()
    console.info(`[apna] onExpenseCreate: group=${groupId} expense=${expenseId} amount=${expense?.amount}`)
    try {
      await writeExpenseCreatedActivity(event)
      await recalculateGroupBalances(groupId)
    } catch (err) {
      console.error(`Error in onExpenseCreate for group=${groupId} expense=${expenseId}:`, err)
    }
  },
)

/**
 * Triggered when an expense is deleted.
 * TODO Prompt 1.3:
 *   1. Recalculate balances (subtract deleted expense)
 *   2. Write feed item: expense_deleted
 */
export const onExpenseDelete = onDocumentDeleted(
  { document: 'groups/{groupId}/expenses/{expenseId}', region: 'asia-south1' },
  async (event) => {
    const { groupId, expenseId } = event.params
    console.info(`[apna] onExpenseDelete: group=${groupId} expense=${expenseId}`)
    try {
      await writeExpenseDeletedActivity(event)
      await recalculateGroupBalances(groupId)
    } catch (err) {
      console.error(`Error in onExpenseDelete for group=${groupId} expense=${expenseId}:`, err)
    }
  },
)

// ── Member Join Trigger ───────────────────────────────────────────────────────

/**
 * Triggered when a group document is updated (catches member join events).
 * Detects new UIDs in members map by comparing before/after.
 * TODO Prompt 1.1:
 *   1. Write feed item: member_joined for each new member
 *   2. Send FCM push to existing members: "{name} joined apna 👋"
 */
export const onMemberJoin = onDocumentUpdated(
  { document: 'groups/{groupId}', region: 'asia-south1' },
  (event) => {
    const { groupId } = event.params
    const before = event.data?.before.data() as Record<string, unknown> | undefined
    const after  = event.data?.after.data()  as Record<string, unknown> | undefined

    const beforeMembers = Object.keys((before?.members ?? {}) as object)
    const afterMembers  = Object.keys((after?.members  ?? {}) as object)
    const newUids = afterMembers.filter((uid) => !beforeMembers.includes(uid))

    if (newUids.length > 0) {
      console.info(`[apna] onMemberJoin: group=${groupId} newMembers=${newUids.join(',')}`)
      // TODO: Prompt 1.1
    }
  },
)

// ── SOS Callable ─────────────────────────────────────────────────────────────

/**
 * Callable function — sends emergency SOS to all group members.
 * TODO Prompt 1.6:
 *   1. Fetch caller's current location from RTDB
 *   2. Send HIGH priority FCM to all group members with location + Maps deeplink
 *   3. Log SOS event for group admin review
 */
export const onSOSTriggered = onCall(
  { region: 'asia-south1' },
  (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in required')
    }
    const { groupId } = request.data as { groupId: string }
    console.info(`[apna] onSOSTriggered: uid=${request.auth.uid} group=${groupId}`)
    // TODO: Prompt 1.6
    return { success: true }
  },
)

// ── Trip Wrap Callable ────────────────────────────────────────────────────────

/**
 * Callable function — generates the Trip Wrap summary for a completed trip.
 * TODO Prompt 3.6:
 *   1. Aggregate: total spend, top category, most active member, photo count
 *   2. Select top 5 memories by reaction count
 *   3. Return settlement summary
 *   4. Store wrap doc for sharing
 */
export const generateTripWrap = onCall(
  { region: 'asia-south1' },
  (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in required')
    }
    const { groupId } = request.data as { groupId: string }
    console.info(`[apna] generateTripWrap: uid=${request.auth.uid} group=${groupId}`)
    // TODO: Prompt 3.6
    return { success: true }
  },
)

// ── Scheduled: Clean up expired location data ─────────────────────────────────

/**
 * Runs every 5 minutes.
 * Deletes /groups/{groupId}/locations/{locationId} nodes where timestamp < 4 hours ago.
 * Keeps RTDB lean — location data has no long-term value.
 * TODO Prompt 1.6: Implement the actual RTDB cleanup query.
 */
export const cleanupExpiredLocations = onSchedule(
  { schedule: 'every 5 minutes', region: 'asia-south1' },
  () => {
    const cutoff = Date.now() - 4 * 60 * 60 * 1000 // 4 hours ago
    console.info(`[apna] cleanupExpiredLocations: cutoff=${new Date(cutoff).toISOString()}`)
    // TODO: Prompt 1.6
  },
)

// ── Scheduled: Itinerary reminders ───────────────────────────────────────────

/**
 * Runs every 60 minutes.
 * Finds itinerary items starting within the next hour and sends FCM reminders.
 * TODO Prompt 3.1: Implement Firestore query + FCM batch send.
 */
export const sendItineraryReminders = onSchedule(
  { schedule: 'every 60 minutes', region: 'asia-south1' },
  () => {
    console.info('[apna] sendItineraryReminders: checking upcoming items')
    // TODO: Prompt 3.1
  },
)

// ── Itinerary Triggers & Callables ───────────────────────────────────────────
export {
  onItineraryItemCreated,
  onItineraryItemDeleted,
} from './triggers/onItineraryWrite'

export { getSuggestions } from './callable/getSuggestions'

