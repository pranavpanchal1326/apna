// functions/src/triggers/onThisDay.ts
import { onSchedule } from 'firebase-functions/v2/scheduler'
import * as admin from 'firebase-admin'
import { getGroupRecipientTokens, sendPushToTokens } from '../notifications/send'

const db = admin.firestore()

export const onThisDay = onSchedule(
  {
    schedule: '0 9 * * *', // Run daily at 09:00 IST
    timeZone: 'Asia/Kolkata',
    region:   'asia-south1',
  },
  async (event) => {
    console.info('[OnThisDay] Starting daily cron for nostalgic memories.')

    const today = new Date()
    const currentMonth = String(today.getMonth() + 1).padStart(2, '0')
    const currentDay = String(today.getDate()).padStart(2, '0')
    const currentYear = today.getFullYear()

    // Generate dates for MM-DD in the last 10 years
    const priorYearDates: string[] = []
    for (let yr = currentYear - 1; yr >= currentYear - 10; yr--) {
      priorYearDates.push(`${yr}-${currentMonth}-${currentDay}`)
    }

    if (priorYearDates.length === 0) {
      console.info('[OnThisDay] No prior dates computed. Exiting.')
      return
    }

    try {
      // Query all memories across all groups matching these dates
      const memoriesSnap = await db.collectionGroup('memories')
        .where('date', 'in', priorYearDates)
        .get()

      if (memoriesSnap.empty) {
        console.info('[OnThisDay] No nostalgic memories found for today across any groups.')
        return
      }

      // Group by groupId
      const groupsWithMemories = new Set<string>()
      memoriesSnap.docs.forEach((doc) => {
        const groupRef = doc.ref.parent.parent
        if (groupRef) {
          groupsWithMemories.add(groupRef.id)
        }
      })

      console.info(`[OnThisDay] Found memories in ${groupsWithMemories.size} groups. Sending notifications.`)

      for (const groupId of groupsWithMemories) {
        try {
          // Fetch group details
          const groupSnap = await db.collection('groups').doc(groupId).get()
          if (!groupSnap.exists) continue
          const groupName = groupSnap.data()?.name ?? 'apna trip'

          // Get all recipient tokens in the group
          const tokens = await getGroupRecipientTokens(groupId)
          if (tokens.length === 0) {
            console.info(`[OnThisDay] No FCM tokens found for group=${groupId}`)
            continue
          }

          // Send push notifications
          await sendPushToTokens({
            tokens,
            title: `✨ On This Day in ${groupName}`,
            body: `Revisit your group's memories from this day in prior years!`,
            data: {
              type: 'on_this_day',
              groupId,
            },
          })

          console.info(`[OnThisDay] Sent On This Day push to ${tokens.length} members in group=${groupId}`)
        } catch (groupErr) {
          console.error(`[OnThisDay] Failed to process notification for group=${groupId}:`, groupErr)
        }
      }
    } catch (err) {
      console.error('[OnThisDay] Error querying collectionGroup or sending notifications:', err)
    }
  }
)
