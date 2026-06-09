// functions/src/triggers/onSettlementNotify.ts
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import * as admin from 'firebase-admin'
import { getGroupRecipientTokens, sendPushToTokens } from '../notifications/send'
import { buildSettlementMessage } from '../notifications/templates'

const db = admin.firestore()

export const onSettlementNotify = onDocumentCreated(
  {
    document: 'groups/{groupId}/settlements/{settlementId}',
    region:   'asia-south1',
  },
  async (event) => {
    const { groupId, settlementId } = event.params
    const settlement = event.data?.data()
    if (!settlement) return

    try {
      const groupSnap = await db.collection('groups').doc(groupId).get()
      if (!groupSnap.exists) return
      const groupName = groupSnap.data()?.name ?? 'apna trip'

      const [actorSnap, receiverSnap] = await Promise.all([
        db.collection('users').doc(settlement.fromUid).get(),
        db.collection('users').doc(settlement.toUid).get(),
      ])

      const actorName = actorSnap.data()?.name?.split(' ')[0] ?? 'Someone'
      const withName = receiverSnap.data()?.name?.split(' ')[0] ?? 'someone'

      const message = buildSettlementMessage({
        groupId,
        groupName,
        actorName,
        actorUid: settlement.fromUid,
        settlementId,
        amount: settlement.amountRupees ?? ((settlement.amountPaise ?? 0) / 100),
        withName,
        withUid: settlement.toUid,
      })

      const tokens = await getGroupRecipientTokens(groupId, [settlement.fromUid])
      if (tokens.length > 0) {
        await sendPushToTokens({
          tokens,
          title: message.title,
          body: message.body,
          data: message.data,
        })
      }
    } catch (err) {
      console.error(`[Notify] Error in onSettlementNotify for group=${groupId} settlement=${settlementId}:`, err)
    }
  }
)
