// functions/src/notifications/send.ts
import * as admin from 'firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import { resolvePrefs, allowsNotification } from './prefs'

const db = admin.firestore()

// Current hour in IST (UTC+5:30) — apna's launch market
function istHour(): number {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).getUTCHours()
}

export interface SendPushParams {
  tokens: string[]
  title: string
  body: string
  data: Record<string, string>
}

export async function sendPushToTokens(params: SendPushParams): Promise<void> {
  const { tokens, title, body, data } = params
  if (!tokens || tokens.length === 0) {
    return
  }

  try {
    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: {
        title,
        body,
      },
      data,
    })

    console.info(`[FCM] Sent notifications: ${response.successCount} success, ${response.failureCount} failure`)

    if (response.failureCount > 0) {
      const tokensToRemove: string[] = []
      response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error) {
          const errorCode = resp.error.code
          const token = tokens[idx]
          if (
            errorCode === 'messaging/invalid-registration-token' ||
            errorCode === 'messaging/registration-token-not-registered'
          ) {
            console.warn(`[FCM] Token ${token} is invalid. Queueing for cleanup.`)
            tokensToRemove.push(token)
          } else {
            console.error(`[FCM] Failed to send push to token at index ${idx}:`, resp.error)
          }
        }
      })

      if (tokensToRemove.length > 0) {
        await cleanupTokens(tokensToRemove)
      }
    }
  } catch (err) {
    console.error('[FCM] Error in sendPushToTokens:', err)
  }
}

async function cleanupTokens(tokens: string[]): Promise<void> {
  try {
    // Find users with these tokens and set their fcmToken to null
    const usersSnap = await db.collection('users')
      .where('fcmToken', 'in', tokens)
      .get()

    if (usersSnap.empty) return

    const batch = db.batch()
    usersSnap.docs.forEach((doc) => {
      batch.update(doc.ref, {
        fcmToken: null,
        fcmTokenUpdatedAt: FieldValue.serverTimestamp(),
      })
    })

    await batch.commit()
    console.info(`[FCM] Cleaned up ${usersSnap.size} invalid tokens.`)
  } catch (err) {
    console.error('[FCM] Failed to cleanup invalid tokens:', err)
  }
}

export async function getGroupRecipientTokens(
  groupId: string,
  excludeUids?: string[],
  // FCM data.type — when given, each member's notificationPrefs
  // (per-category toggles + silent hours) filter delivery. SOS bypasses all.
  notifType?: string
): Promise<string[]> {
  try {
    const groupSnap = await db.collection('groups').doc(groupId).get()
    if (!groupSnap.exists) {
      console.error(`[FCM] Group ${groupId} does not exist`)
      return []
    }

    const groupData = groupSnap.data()
    const memberIds = (groupData?.memberIds ?? []) as string[]
    if (memberIds.length === 0) return []

    const uidsToFetch = excludeUids
      ? memberIds.filter((uid) => !excludeUids.includes(uid))
      : memberIds

    if (uidsToFetch.length === 0) return []

    const tokens: string[] = []
    // Firestore getAll works with doc references
    const docRefs = uidsToFetch.map((uid) => db.collection('users').doc(uid))
    
    // getAll can take max 1000 items, groups will be much smaller
    const hour = istHour()
    const userSnaps = await db.getAll(...docRefs)
    userSnaps.forEach((snap) => {
      if (snap.exists) {
        const userData = snap.data()
        if (!userData?.fcmToken) return
        if (notifType) {
          const prefs = resolvePrefs(userData.notificationPrefs)
          if (!allowsNotification(prefs, notifType, hour)) return
        }
        tokens.push(userData.fcmToken)
      }
    })

    // Return deduped tokens
    return Array.from(new Set(tokens))
  } catch (err) {
    console.error('[FCM] Error in getGroupRecipientTokens:', err)
    return []
  }
}
