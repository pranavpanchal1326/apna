// functions/src/triggers/onGroupBudgetUpdated.ts
import { onDocumentUpdated } from 'firebase-functions/v2/firestore'
import * as admin from 'firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

const db = admin.firestore()

export const onGroupBudgetUpdated = onDocumentUpdated(
  {
    document: 'groups/{groupId}',
    region:   'asia-south1',
  },
  async (event) => {
    const { groupId } = event.params
    const beforeData = event.data?.before.data()
    const afterData = event.data?.after.data()

    if (!beforeData || !afterData) return

    const beforeBudget = beforeData.totalBudget !== undefined && beforeData.totalBudget !== null
      ? beforeData.totalBudget
      : null
    const afterBudget = afterData.totalBudget !== undefined && afterData.totalBudget !== null
      ? afterData.totalBudget
      : null

    // If totalBudget has not changed, do nothing
    if (beforeBudget === afterBudget) return

    console.info(`[apna] onGroupBudgetUpdated: group=${groupId} budget changed from ${beforeBudget} to ${afterBudget}`)

    try {
      let type: 'budgetset' | 'budgetupdated' | 'budgetremoved'
      let amount = 0

      if (beforeBudget === null && afterBudget !== null) {
        type = 'budgetset'
        amount = afterBudget
      } else if (beforeBudget !== null && afterBudget !== null) {
        type = 'budgetupdated'
        amount = afterBudget
      } else if (beforeBudget !== null && afterBudget === null) {
        type = 'budgetremoved'
        amount = beforeBudget
      } else {
        return // Should not occur
      }

      const actorUid = afterData.updatedByUid || afterData.createdBy || 'system'

      // 1. Write activity feed item
      const activityRef = db.collection(`groups/${groupId}/activity`).doc()
      await activityRef.set({
        actorUid,
        type,
        createdAt: FieldValue.serverTimestamp(),
        metadata: {
          amount,
          ...(type === 'budgetupdated' ? { previousAmount: beforeBudget } : {}),
        },
      })

      // 2. Update lastActivityAt on group doc
      await db.collection('groups').doc(groupId).update({
        lastActivityAt: FieldValue.serverTimestamp(),
      })

    } catch (err) {
      console.error(`Error in onGroupBudgetUpdated for group=${groupId}:`, err)
      throw err
    }
  }
)
