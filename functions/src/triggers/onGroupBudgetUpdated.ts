// functions/src/triggers/onGroupBudgetUpdated.ts
import { onDocumentUpdated } from 'firebase-functions/v2/firestore'
import * as admin from 'firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import { getGroupRecipientTokens, sendPushToTokens } from '../notifications/send'

const db = admin.firestore()

function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return String(amount)
  return num.toLocaleString('en-IN')
}

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
      let type: 'budget-set' | 'budget-updated' | 'budget-removed'
      let amount = 0

      if (beforeBudget === null && afterBudget !== null) {
        type = 'budget-set'
        amount = afterBudget
      } else if (beforeBudget !== null && afterBudget !== null) {
        type = 'budget-updated'
        amount = afterBudget
      } else if (beforeBudget !== null && afterBudget === null) {
        type = 'budget-removed'
        amount = beforeBudget
      } else {
        return // Should not occur
      }

      const actorUid = afterData.updatedByUid || afterData.createdBy || 'system'
      const groupName = afterData.name || 'Trip'

      // 1. Write activity feed item
      const activityRef = db.collection(`groups/${groupId}/activity`).doc()
      await activityRef.set({
        actorUid,
        type,
        createdAt: FieldValue.serverTimestamp(),
        metadata: {
          amount,
          ...(type === 'budget-updated' ? { previousAmount: beforeBudget } : {}),
        },
      })

      // Get actor name
      let actorName = 'Someone'
      if (actorUid !== 'system') {
        const actorSnap = await db.collection('users').doc(actorUid).get()
        if (actorSnap.exists) {
          actorName = actorSnap.data()?.name?.split(' ')[0] ?? 'Someone'
        }
      }

      // Fetch all active expenses to compute current spend
      const expensesSnap = await db.collection(`groups/${groupId}/expenses`).get()
      let currentSpend = 0
      expensesSnap.docs.forEach((doc) => {
        const exp = doc.data()
        if (exp.status !== 'deleted') {
          currentSpend += (exp.amount || 0)
        }
      })

      // 2. Notification Policy Checks
      let shouldNotify = false
      let notifyTitle = groupName
      let notifyBody = ''

      if (type === 'budget-set') {
        // budget is first set
        shouldNotify = true
        notifyBody = `${actorName} set the trip budget to ₹${formatCurrency(amount)}`
      } else if (afterBudget !== null) {
        // budget crosses into over-budget state
        const crossedOver = currentSpend > afterBudget && (beforeBudget === null || currentSpend <= beforeBudget)
        
        // budget is sharply reduced below current spend
        const sharplyReduced = afterBudget < currentSpend && (beforeBudget === null || afterBudget < beforeBudget)

        if (crossedOver) {
          shouldNotify = true
          notifyBody = `Trip budget has been exceeded! Spent: ₹${formatCurrency(currentSpend)} / Limit: ₹${formatCurrency(afterBudget)}`
        } else if (sharplyReduced) {
          shouldNotify = true
          notifyBody = `${actorName} reduced the budget to ₹${formatCurrency(afterBudget)}, which is below current spend (₹${formatCurrency(currentSpend)})`
        }
      }

      // Send notifications if applicable
      if (shouldNotify) {
        const recipientUids = (afterData.memberIds ?? []).filter((uid: string) => uid !== actorUid)
        const tokens = await getGroupRecipientTokens(groupId, [actorUid])

        // A. Record notification job document
        await db.collection(`groups/${groupId}/notificationJobs`).add({
          type: 'budget_alert',
          groupId,
          title: notifyTitle,
          body: notifyBody,
          recipientUids,
          createdAt: FieldValue.serverTimestamp(),
          sent: tokens.length > 0,
        })

        // B. Send push notification directly via FCM
        if (tokens.length > 0) {
          await sendPushToTokens({
            tokens,
            title: notifyTitle,
            body: notifyBody,
            data: {
              type: 'budget_alert',
              groupId,
              groupName,
            },
          })
        }
      }

      // 3. Update lastActivityAt on group doc
      await db.collection('groups').doc(groupId).update({
        lastActivityAt: FieldValue.serverTimestamp(),
      })

    } catch (err) {
      console.error(`Error in onGroupBudgetUpdated for group=${groupId}:`, err)
      throw err
    }
  }
)
