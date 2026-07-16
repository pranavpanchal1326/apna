// functions/src/triggers/generateYearInReview.ts
// Year in Review (PRD §17) — auto-generated December recap.
// Runs every Dec 1 at 10:30 AM IST (05:00 UTC), writes
// groups/{groupId}/yearInReview/{year} and notifies members.

import * as admin from 'firebase-admin'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { buildYearInReview } from '../recap/yearReviewBuilder'
import { resolvePrefs, allowsNotification } from '../notifications/prefs'

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

export const generateYearInReview = onSchedule(
  // Dec 1, 05:00 UTC = 10:30 AM IST
  { schedule: '0 5 1 12 *', region: 'asia-south1', timeoutSeconds: 540 },
  async () => {
    const db = admin.firestore()
    const year = new Date(Date.now() + IST_OFFSET_MS).getUTCFullYear()
    console.info(`[apna] generateYearInReview: starting for year=${year}`)

    const groupsSnap = await db.collection('groups').get()
    let generated = 0

    for (const groupDoc of groupsSnap.docs) {
      try {
        const review = await buildYearInReview(groupDoc.id, year)
        if (!review) continue // no activity this year

        await groupDoc.ref
          .collection('yearInReview')
          .doc(String(year))
          .set(review)
        generated++

        await notifyMembers(groupDoc.id, review.groupName, year)
      } catch (err) {
        console.error(`[apna] generateYearInReview failed for group=${groupDoc.id}:`, err)
      }
    }

    console.info(
      `[apna] generateYearInReview: done — groups=${groupsSnap.size} generated=${generated}`,
    )
  },
)

async function notifyMembers(groupId: string, groupName: string, year: number): Promise<void> {
  const db = admin.firestore()
  const groupSnap = await db.collection('groups').doc(groupId).get()
  const memberIds = (groupSnap.data()?.memberIds ?? []) as string[]
  if (memberIds.length === 0) return

  const istHour = new Date(Date.now() + IST_OFFSET_MS).getUTCHours()
  const userSnaps = await db.getAll(...memberIds.map((uid) => db.collection('users').doc(uid)))
  const tokens = Array.from(
    new Set(
      userSnaps
        .map((snap) => snap.data() as { fcmToken?: string; notificationPrefs?: unknown } | undefined)
        .filter((user) =>
          allowsNotification(resolvePrefs(user?.notificationPrefs), 'YEAR_IN_REVIEW', istHour),
        )
        .map((user) => user?.fcmToken)
        .filter((token): token is string => Boolean(token)),
    ),
  )
  if (tokens.length === 0) return

  await admin.messaging().sendEachForMulticast({
    tokens,
    notification: {
      title: `Your ${year} with ${groupName} 🎉`,
      body: 'Your Year in Review is ready — relive the best moments!',
    },
    data: { type: 'YEAR_IN_REVIEW', groupId, year: String(year) },
    android: {
      priority: 'high',
      notification: { channelId: 'memories' },
    },
  })
}
