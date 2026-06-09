// functions/src/triggers/onSettlementWrite.ts
import * as admin from 'firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import { FirestoreEvent } from 'firebase-functions/v2/firestore'

const db = admin.firestore()

export async function writeSettlementCreatedActivity(
  event: FirestoreEvent<any, { groupId: string; settlementId: string }>
): Promise<void> {
  const { groupId, settlementId } = event.params
  const settlement = event.data?.data()
  if (!settlement) return

  // Write to activity feed
  const activityRef = db.collection(`groups/${groupId}/activity`).doc()
  await activityRef.set({
    actorUid: settlement.fromUid,
    type: 'settled',
    createdAt: FieldValue.serverTimestamp(),
    metadata: {
      amount: settlement.amountRupees,
      note: settlement.note || null,
      settlementId: settlementId,
    },
  })

  // Get group info for notification
  const groupSnap = await db.collection('groups').doc(groupId).get()
  const groupName = groupSnap.data()?.name ?? 'apna trip'
  const memberIds = (groupSnap.data()?.memberIds ?? []) as string[]

  // Fetch payer and receiver names
  const [payerSnap, receiverSnap] = await Promise.all([
    db.collection('users').doc(settlement.fromUid).get(),
    db.collection('users').doc(settlement.toUid).get(),
  ])
  const payerName = payerSnap.data()?.name?.split(' ')[0] ?? 'Someone'
  const receiverName = receiverSnap.data()?.name?.split(' ')[0] ?? 'someone'

  // Fetch fcmTokens for group members (except payer)
  const notificationTargets = memberIds.filter(uid => uid !== settlement.fromUid)
  if (notificationTargets.length === 0) return

  const tokens: string[] = []
  const userSnaps = await db.getAll(
    ...notificationTargets.map(uid => db.collection('users').doc(uid))
  )
  userSnaps.forEach((snap) => {
    if (snap.exists) {
      const data = snap.data()
      if (data?.fcmToken) {
        tokens.push(data.fcmToken)
      }
    }
  })

  if (tokens.length > 0) {
    try {
      await admin.messaging().sendEachForMulticast({
        tokens,
        notification: {
          title: groupName,
          body: `${payerName} paid ${receiverName} ₹${settlement.amountRupees}`,
        },
        data: {
          groupId,
          settlementId,
          type: 'settled',
        },
      })
    } catch (err) {
      console.error('Error sending multicast FCM notification for settlement:', err)
    }
  }
}

export async function writeSettlementDeletedActivity(
  event: FirestoreEvent<any, { groupId: string; settlementId: string }>
): Promise<void> {
  const { groupId } = event.params

  // Write to feed
  const activityRef = db.collection(`groups/${groupId}/activity`).doc()
  await activityRef.set({
    actorUid: 'system',
    type: 'trip_event',
    createdAt: FieldValue.serverTimestamp(),
    metadata: {
      title: 'A settlement was deleted',
    },
  })
}
