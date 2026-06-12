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

// ── Settlement Triggers ──────────────────────────────────────────────────────

export { onSettlementCreate } from './triggers/onSettlementCreate'

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
/** @deprecated Use generateTripRecap — kept for backward compatibility */
export const generateTripWrap = onCall(
  { region: 'asia-south1' },
  (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in required')
    }
    const { groupId } = request.data as { groupId: string }
    console.info(`[apna] generateTripWrap (legacy): uid=${request.auth.uid} group=${groupId}`)
    return { success: true, message: 'use_generateTripRecap' }
  },
)

export const cleanupExpiredLocations = onSchedule(
  { schedule: 'every 5 minutes', region: 'asia-south1' },
  async () => {
    const cutoff = Date.now() - 4 * 60 * 60 * 1000 // 4 hours ago
    console.info(`[apna] cleanupExpiredLocations: cutoff=${new Date(cutoff).toISOString()}`)
    
    try {
      const db = admin.database()
      const groupsRef = db.ref('groups')
      const snapshot = await groupsRef.once('value')
      const groups = snapshot.val() as Record<
        string,
        { locations?: Record<string, { timestamp?: number }> }
      > | null

      if (!groups) {
        console.info('[apna] No group locations found in RTDB.')
        return
      }

      const updates: Record<string, null> = {}
      let count = 0

      for (const [groupId, groupData] of Object.entries(groups)) {
        if (!groupData || typeof groupData !== 'object') continue
        
        const locations = groupData.locations
        if (!locations || typeof locations !== 'object') continue

        for (const [userId, locUpdate] of Object.entries(locations)) {
          if (!locUpdate || typeof locUpdate !== 'object') continue
          const timestamp = locUpdate.timestamp
          
          if (typeof timestamp === 'number' && timestamp < cutoff) {
            updates[`${groupId}/locations/${userId}`] = null
            count++
          }
        }
      }

      if (count > 0) {
        await groupsRef.update(updates)
        console.info(`[apna] cleanupExpiredLocations: cleaned up ${count} expired locations.`)
      } else {
        console.info('[apna] cleanupExpiredLocations: no expired locations to clean up.')
      }
    } catch (error) {
      console.error('[apna] Error cleaning up expired locations:', error)
    }
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
  async () => {
    const now = new Date()
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000)
    const todayDate = now.toISOString().split('T')[0]
    const windowStart = toMinutes(now)
    const windowEnd = toMinutes(oneHourLater)

    console.info(`[apna] sendItineraryReminders: checking ${todayDate} ${formatTime(now)}-${formatTime(oneHourLater)}`)

    const snap = await admin.firestore()
      .collectionGroup('items')
      .where('dayId', '==', todayDate)
      .get()

    const reminders = snap.docs
      .map((doc) => doc.data() as ReminderItineraryItem)
      .filter((item) => {
        if (item.completed === true || !item.timeSlot?.startTime) return false
        const start = timeStringToMinutes(item.timeSlot.startTime)
        return start >= windowStart && start <= windowEnd
    })

    for (const item of reminders) {
      const tokens = await getGroupRecipientTokensForReminder(item.groupId)
      if (tokens.length === 0) continue

      const place = item.placeRef?.name ? ` at ${item.placeRef.name}` : ''
      await sendReminderPush({
        tokens,
        title: `${item.title} in 1 hour`,
        body: `Starting at ${item.timeSlot?.startTime ?? 'soon'}${place}`,
        data: {
          type: 'ITINERARY_REMINDER',
          groupId: item.groupId,
          dayId: item.dayId,
          itemId: item.id,
        },
      })

      console.info(`[apna] Sent itinerary reminder item=${item.id} group=${item.groupId} tokens=${tokens.length}`)
    }
  },
)

interface ReminderItineraryItem {
  id: string
  groupId: string
  dayId: string
  title: string
  completed?: boolean
  timeSlot?: {
    startTime?: string
  }
  placeRef?: {
    name?: string
  }
}

function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function toMinutes(date: Date): number {
  return date.getHours() * 60 + date.getMinutes()
}

function timeStringToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

async function getGroupRecipientTokensForReminder(groupId: string): Promise<string[]> {
  const db = admin.firestore()
  const groupSnap = await db.collection('groups').doc(groupId).get()
  if (!groupSnap.exists) return []

  const group = groupSnap.data() as { memberIds?: string[] } | undefined
  const memberIds = group?.memberIds ?? []
  if (memberIds.length === 0) return []

  const userSnaps = await db.getAll(...memberIds.map((uid) => db.collection('users').doc(uid)))
  const tokens = userSnaps
    .map((snap) => snap.data() as { fcmToken?: string } | undefined)
    .map((user) => user?.fcmToken)
    .filter((token): token is string => Boolean(token))

  return Array.from(new Set(tokens))
}

async function sendReminderPush(params: {
  tokens: string[]
  title: string
  body: string
  data: Record<string, string>
}): Promise<void> {
  await admin.messaging().sendEachForMulticast({
    tokens: params.tokens,
    notification: {
      title: params.title,
      body: params.body,
    },
    data: params.data,
    android: {
      priority: 'high',
      notification: {
        channelId: 'itinerary_reminders',
      },
    },
  })
}

export { onItineraryItemCreated, onItineraryItemDeleted, onItineraryItemUpdated } from './triggers/onItineraryWrite'
export { getSuggestions } from './callable/getSuggestions'
export {
  ensureReferralLink,
  captureReferralAttribution,
  processReferralQualification,
} from './callable/referralCallables'
export { generateTripRecap, updateRecapVisibility } from './callable/tripRecapCallables'
export { computeSettlements } from './computeSettlements'

// ── Notification Triggers ──────────────────────────────────────────────────
export { onExpenseWriteNotify } from './triggers/onExpenseWriteNotify'
export { onSettlementNotify } from './triggers/onSettlementNotify'
export { onGroupWriteNotify } from './triggers/onGroupWriteNotify'
export { onGroupBudgetUpdated } from './triggers/onGroupBudgetUpdated'
export { onMemoryReaction } from './triggers/onMemoryReaction'
export { onThisDay } from './triggers/onThisDay'


