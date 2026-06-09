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


    } catch (err) {
      console.error(`Error in onSettlementCreate for group=${groupId} settlement=${settlementId}:`, err)
      throw err
    }
  }
)
