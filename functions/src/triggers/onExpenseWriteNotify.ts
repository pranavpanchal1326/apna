// functions/src/triggers/onExpenseWriteNotify.ts
import { onDocumentWritten } from 'firebase-functions/v2/firestore'
import * as admin from 'firebase-admin'
import { getGroupRecipientTokens, sendPushToTokens } from '../notifications/send'
import { buildExpenseAddedMessage, buildExpenseUpdatedMessage } from '../notifications/templates'

const db = admin.firestore()

export const onExpenseWriteNotify = onDocumentWritten(
  {
    document: 'groups/{groupId}/expenses/{expenseId}',
    region:   'asia-south1',
  },
  async (event) => {
    const { groupId, expenseId } = event.params
    const beforeData = event.data?.before.data()
    const afterData = event.data?.after.data()

    // 1. Delete event - skip
    if (!afterData) {
      console.info(`[Notify] Expense deleted: ${expenseId}. Skipping notification.`)
      return
    }

    try {
      // Get group details
      const groupSnap = await db.collection('groups').doc(groupId).get()
      if (!groupSnap.exists) return
      const groupName = groupSnap.data()?.name ?? 'apna trip'

      // 2. Create event
      if (!beforeData) {
        const actorUid = afterData.paidBy || afterData.createdBy
        const paidByUid = afterData.paidBy || actorUid

        const actorSnap = await db.collection('users').doc(paidByUid).get()
        const actorName = actorSnap.data()?.name?.split(' ')[0] ?? 'Someone'

        const message = buildExpenseAddedMessage({
          groupId,
          groupName,
          actorName,
          actorUid: paidByUid,
          expenseId,
          title: afterData.description || afterData.title || 'Expense',
          amount: afterData.amount || 0,
        })

        const tokens = await getGroupRecipientTokens(groupId, [paidByUid])
        if (tokens.length > 0) {
          await sendPushToTokens({
            tokens,
            title: message.title,
            body: message.body,
            data: message.data,
          })
        }
        return
      }

      // 3. Update event - check if meaningful
      const isMeaningfulUpdate =
        beforeData.amount !== afterData.amount ||
        beforeData.description !== afterData.description ||
        beforeData.paidBy !== afterData.paidBy ||
        JSON.stringify(beforeData.splits) !== JSON.stringify(afterData.splits)

      if (isMeaningfulUpdate) {
        const actorUid = afterData.paidBy || afterData.createdBy
        const paidByUid = afterData.paidBy || actorUid

        const actorSnap = await db.collection('users').doc(paidByUid).get()
        const actorName = actorSnap.data()?.name?.split(' ')[0] ?? 'Someone'

        const message = buildExpenseUpdatedMessage({
          groupId,
          groupName,
          actorName,
          actorUid: paidByUid,
          expenseId,
          title: afterData.description || afterData.title || 'Expense',
          amount: afterData.amount || 0,
        })

        const tokens = await getGroupRecipientTokens(groupId, [paidByUid])
        if (tokens.length > 0) {
          await sendPushToTokens({
            tokens,
            title: message.title,
            body: message.body,
            data: message.data,
          })
        }
      }
    } catch (err) {
      console.error(`[Notify] Error in onExpenseWriteNotify for group=${groupId} expense=${expenseId}:`, err)
    }
  }
)
