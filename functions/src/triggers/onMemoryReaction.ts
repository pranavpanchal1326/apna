// functions/src/triggers/onMemoryReaction.ts
import { onDocumentUpdated } from 'firebase-functions/v2/firestore'
import * as admin from 'firebase-admin'
import { sendPushToTokens } from '../notifications/send'
import { resolvePrefs, allowsNotification } from '../notifications/prefs'

const db = admin.firestore()

export const onMemoryReaction = onDocumentUpdated(
  {
    document: 'groups/{groupId}/memories/{memoryId}',
    region:   'asia-south1',
  },
  async (event) => {
    const { groupId, memoryId } = event.params
    const beforeData = event.data?.before.data()
    const afterData = event.data?.after.data()

    if (!beforeData || !afterData) {
      return
    }

    const beforeReactions = (beforeData.reactions || {}) as Record<string, string>
    const afterReactions = (afterData.reactions || {}) as Record<string, string>

    // 1. Detect if a reaction was added or modified
    let reactorUid: string | null = null
    let newEmoji: string | null = null

    for (const [uid, emoji] of Object.entries(afterReactions)) {
      if (beforeReactions[uid] !== emoji) {
        reactorUid = uid
        newEmoji = emoji
        break
      }
    }

    if (!reactorUid || !newEmoji) {
      return // No new reaction added or modified
    }

    const photographerUid = (afterData.takenBy || afterData.createdBy) as string
    if (reactorUid === photographerUid) {
      console.info(`[Notify] Reaction by photographer themselves (${reactorUid}). Skipping notification.`)
      return
    }

    try {
      // 2. Quiet hours are enforced per-user via notificationPrefs below
      //    (default window 11pm–8am IST, user-configurable).

      // 3. Fetch reactor user details
      const reactorSnap = await db.collection('users').doc(reactorUid).get()
      const reactorName = reactorSnap.data()?.name?.split(' ')[0] ?? 'Someone'

      // 4. Fetch group details
      const groupSnap = await db.collection('groups').doc(groupId).get()
      const groupName = groupSnap.data()?.name ?? 'apna trip'

      // 5. Fetch photographer's token — honoring their notification prefs
      const photographerSnap = await db.collection('users').doc(photographerUid).get()
      const photographerToken = photographerSnap.data()?.fcmToken as string | undefined
      const prefs = resolvePrefs(photographerSnap.data()?.notificationPrefs)
      const istHour = new Date(Date.now() + 5.5 * 60 * 60 * 1000).getUTCHours()

      if (photographerToken && allowsNotification(prefs, 'memory_reaction', istHour)) {
        await sendPushToTokens({
          tokens: [photographerToken],
          title: groupName,
          body: `${reactorName} reacted ${newEmoji} to your photo`,
          data: {
            type: 'memory_reaction',
            groupId,
            memoryId,
            reactorUid,
            emoji: newEmoji,
          },
        })
        console.info(`[Notify] Sent reaction notification to user=${photographerUid}`)
      } else {
        console.info(`[Notify] Photographer ${photographerUid} has no FCM token.`)
      }
    } catch (err) {
      console.error(`[Notify] Error in onMemoryReaction trigger for group=${groupId} memory=${memoryId}:`, err)
    }
  }
)
