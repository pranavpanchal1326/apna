// functions/src/triggers/sendEventReminders.ts
// PRD §14 reminders:
//   • sendHangoutReminders      — "2 hours before" a confirmed hangout (hourly sweep)
//   • sendTaskDeadlineReminders — "1 day before" an unchecked task deadline (daily, 9 AM IST)
//
// All dates in hangout/list docs are IST wall-time strings (YYYY-MM-DD / HH:MM),
// matching how the app writes them for its launch market.

import * as admin from 'firebase-admin'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { resolvePrefs, allowsNotification } from '../notifications/prefs'

export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

/** Current time shifted to IST wall-clock (read with getUTC* methods). */
export function nowIST(now: number = Date.now()): Date {
  return new Date(now + IST_OFFSET_MS)
}

/** YYYY-MM-DD for an IST-shifted date. */
export function istDateString(istDate: Date): string {
  return istDate.toISOString().split('T')[0]
}

/**
 * Epoch millis (UTC) for an IST wall-time given as YYYY-MM-DD + HH:MM.
 * Returns null when the time string is missing/malformed.
 */
export function istWallTimeToEpoch(date: string, time?: string): number | null {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) return null
  const parsed = Date.parse(`${date}T${time}:00.000Z`)
  if (Number.isNaN(parsed)) return null
  return parsed - IST_OFFSET_MS
}

/**
 * Should a reminder fire for an event starting at `eventEpoch`, given an
 * hourly sweep at `nowEpoch`? Window: [now+2h, now+3h) — each event is
 * caught by exactly one sweep, so no dedupe write is needed.
 */
export function isInTwoHourWindow(eventEpoch: number, nowEpoch: number): boolean {
  const lead = eventEpoch - nowEpoch
  return lead >= 2 * 60 * 60 * 1000 && lead < 3 * 60 * 60 * 1000
}

// ── Shared push plumbing ─────────────────────────────────────────────────────

async function getRecipientTokens(
  memberIds: string[],
  notifType: string,
): Promise<string[]> {
  if (memberIds.length === 0) return []
  const db = admin.firestore()
  const istHour = nowIST().getUTCHours()
  const userSnaps = await db.getAll(...memberIds.map((uid) => db.collection('users').doc(uid)))
  const tokens = userSnaps
    .map((snap) => snap.data() as { fcmToken?: string; notificationPrefs?: unknown } | undefined)
    .filter((user) => allowsNotification(resolvePrefs(user?.notificationPrefs), notifType, istHour))
    .map((user) => user?.fcmToken)
    .filter((token): token is string => Boolean(token))
  return Array.from(new Set(tokens))
}

async function sendPush(params: {
  tokens: string[]
  title: string
  body: string
  data: Record<string, string>
  channelId: string
}): Promise<void> {
  if (params.tokens.length === 0) return
  await admin.messaging().sendEachForMulticast({
    tokens: params.tokens,
    notification: { title: params.title, body: params.body },
    data: params.data,
    android: {
      priority: 'high',
      notification: { channelId: params.channelId },
    },
  })
}

async function getGroupMemberIds(groupId: string): Promise<string[]> {
  const snap = await admin.firestore().collection('groups').doc(groupId).get()
  if (!snap.exists) return []
  return (snap.data() as { memberIds?: string[] })?.memberIds ?? []
}

// ── Hangout reminders — 2 hours before ──────────────────────────────────────

interface HangoutDoc {
  id?: string
  groupId: string
  title: string
  status: string
  scheduledDate: string
  scheduledTime?: string
  placeName?: string
}

export const sendHangoutReminders = onSchedule(
  { schedule: 'every 60 minutes', region: 'asia-south1' },
  async () => {
    const nowEpoch = Date.now()
    const ist = nowIST(nowEpoch)
    const today = istDateString(ist)
    // A 2–3h look-ahead can cross IST midnight — check tomorrow's date too.
    const tomorrow = istDateString(new Date(ist.getTime() + 24 * 60 * 60 * 1000))

    const snap = await admin.firestore()
      .collectionGroup('hangouts')
      .where('status', '==', 'confirmed')
      .where('scheduledDate', 'in', [today, tomorrow])
      .get()

    let sent = 0
    for (const doc of snap.docs) {
      const hangout = doc.data() as HangoutDoc
      const eventEpoch = istWallTimeToEpoch(hangout.scheduledDate, hangout.scheduledTime)
      if (eventEpoch === null || !isInTwoHourWindow(eventEpoch, nowEpoch)) continue

      const memberIds = await getGroupMemberIds(hangout.groupId)
      const tokens = await getRecipientTokens(memberIds, 'HANGOUT_REMINDER')
      if (tokens.length === 0) continue

      const place = hangout.placeName ? ` at ${hangout.placeName}` : ''
      await sendPush({
        tokens,
        title: `${hangout.title} in 2 hours`,
        body: `Starting at ${hangout.scheduledTime}${place}. See you there!`,
        data: {
          type: 'HANGOUT_REMINDER',
          groupId: hangout.groupId,
          hangoutId: doc.id,
        },
        channelId: 'hangout_reminders',
      })
      sent++
    }

    console.info(`[apna] sendHangoutReminders: checked=${snap.size} sent=${sent}`)
  },
)

// ── Task deadline reminders — 1 day before, 9 AM IST ─────────────────────────

interface TaskItemDoc {
  groupId: string
  listId?: string
  text: string
  checked?: boolean
  claimedBy?: string
  deadlineDate?: string
}

export const sendTaskDeadlineReminders = onSchedule(
  // 9:00 AM IST = 03:30 UTC
  { schedule: '30 3 * * *', region: 'asia-south1' },
  async () => {
    const ist = nowIST()
    const tomorrow = istDateString(new Date(ist.getTime() + 24 * 60 * 60 * 1000))

    const snap = await admin.firestore()
      .collectionGroup('items')
      .where('deadlineDate', '==', tomorrow)
      .where('checked', '==', false)
      .get()

    let sent = 0
    for (const doc of snap.docs) {
      const item = doc.data() as TaskItemDoc
      // The 'items' collection group also contains itinerary day items —
      // those never have deadlineDate, so this query only matches list items.
      if (!item.listId || !item.groupId) continue

      // Claimed task → remind only the claimer. Unclaimed → whole group.
      const recipientIds = item.claimedBy
        ? [item.claimedBy]
        : await getGroupMemberIds(item.groupId)
      const tokens = await getRecipientTokens(recipientIds, 'TASK_REMINDER')
      if (tokens.length === 0) continue

      await sendPush({
        tokens,
        title: 'Task due tomorrow',
        body: `"${item.text}" is due tomorrow — don't forget!`,
        data: {
          type: 'TASK_REMINDER',
          groupId: item.groupId,
          listId: item.listId,
          itemId: doc.id,
        },
        channelId: 'task_reminders',
      })
      sent++
    }

    console.info(`[apna] sendTaskDeadlineReminders: due=${snap.size} sent=${sent}`)
  },
)
