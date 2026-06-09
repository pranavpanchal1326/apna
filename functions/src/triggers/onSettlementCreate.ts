// functions/src/triggers/onSettlementCreate.ts
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import * as admin from 'firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import { recalculateGroupBalances } from './onExpenseWrite'

const db = admin.firestore()

export const onSettlementCreate = onDocumentCreated(
  {
    document: 'groups/{groupId}/settlements/{settlementId}',
    region:   'asia-south1',
  },
  async (event) => {
    const { groupId, settlementId } = event.params
    const settlement = event.data?.data()
    if (!settlement) return

    console.info(`[apna] onSettlementCreate: group=${groupId} settlement=${settlementId}`)

    try {
      // 1. Write settled activity feed item
      const activityRef = db.collection(`groups/${groupId}/activity`).doc()
      await activityRef.set({
        actorUid:  settlement.fromUid,
        type:      'settled',
        createdAt: FieldValue.serverTimestamp(),
        metadata: {
          amount:       settlement.amountRupees,
          toUid:        settlement.toUid,
          settlementId: settlementId,
          note:         settlement.note || null,
        },
      })

      // 2. Recalculate balances server-side
      await recalculateGroupBalances(groupId)

      // 3. Update lastActivityAt on group doc
      await db.collection('groups').doc(groupId).update({
        lastActivityAt: FieldValue.serverTimestamp(),
      })

      // 4. Send FCM Push notification to other group members
      const groupSnap = await db.collection('groups').doc(groupId).get()
      const groupName = groupSnap.data()?.name ?? 'apna trip'
      const memberIds = (groupSnap.data()?.memberIds ?? []) as string[]

      const [payerSnap, receiverSnap] = await Promise.all([
        db.collection('users').doc(settlement.fromUid).get(),
        db.collection('users').doc(settlement.toUid).get(),
      ])
      const payerName = payerSnap.data()?.name?.split(' ')[0] ?? 'Someone'
      const receiverName = receiverSnap.data()?.name?.split(' ')[0] ?? 'someone'

      const notificationTargets = memberIds.filter(uid => uid !== settlement.fromUid)
      if (notificationTargets.length > 0) {
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
        }
      }
    } catch (err) {
      console.error(`Error in onSettlementCreate for group=${groupId} settlement=${settlementId}:`, err)
      throw err
    }
  }
)
