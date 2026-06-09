// functions/src/triggers/onExpenseWrite.ts
import * as admin from 'firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import { FirestoreEvent } from 'firebase-functions/v2/firestore'
import { buildGroupBalance, checkConservation } from '../engine/balanceEngine'
import type { FnExpense, FnSettlement } from '../engine/balanceEngine'

const db = admin.firestore()

// Recalculates group balances and updates the group document.
// Uses paise-based balance engine for accuracy — no floating point drift.
export async function recalculateGroupBalances(groupId: string): Promise<void> {
  const groupRef  = db.collection('groups').doc(groupId)
  const groupSnap = await groupRef.get()
  if (!groupSnap.exists) {
    console.error(`Group ${groupId} does not exist`)
    return
  }

  const groupData = groupSnap.data()
  const memberIds = (groupData?.memberIds ?? []) as string[]

  // Fetch all expenses
  const expensesSnap = await db.collection(`groups/${groupId}/expenses`).get()
  const expenses: FnExpense[] = expensesSnap.docs.map(doc => {
    const data = doc.data()
    return {
      paidBy:    data.paidBy    as string,
      splits:    (data.splits   as Record<string, number>) ?? {},
      amount:    data.amount    as number,
      isSettled: !!data.isSettled,
      status:    data.status    as string | undefined,
    }
  })

  // Fetch recorded settlements
  const settlementsSnap = await db
    .collection(`groups/${groupId}/settlements`)
    .get()
  const settlements: FnSettlement[] = settlementsSnap.docs.map(doc => {
    const data = doc.data()
    return {
      fromUid:     data.fromUid     as string,
      toUid:       data.toUid       as string,
      amountPaise: data.amountPaise as number,
    }
  })

  // Build full balance summary
  const summary = buildGroupBalance(expenses, memberIds, settlements)

  // Conservation check — log drift if non-zero
  const { isValid, drift } = checkConservation(summary.balances.reduce(
    (acc, b) => { acc[b.uid] = b.netPaise; return acc },
    {} as Record<string, number>
  ))
  if (!isValid) {
    console.warn(`[balanceEngine] Drift in group ${groupId}: ${drift} paise`)
  }

  // Persist simplified debts + total to group document
  await groupRef.update({
    balances: summary.debts.map(d => ({
      fromUid: d.fromUid,
      toUid:   d.toUid,
      amount:  d.amountRupees,
    })),
    totalExpensesRupees: summary.totalRupees,
    isFullySettled:      summary.isFullySettled,
    balancesUpdatedAt:   FieldValue.serverTimestamp(),
  })

  console.info(`[onExpenseWrite] Balances recalculated for group ${groupId}: ${summary.debts.length} debts`)
}

// Writes an expense_added activity feed log item and notifies other group members.

export async function writeExpenseCreatedActivity(
  event: FirestoreEvent<any, { groupId: string; expenseId: string }>
): Promise<void> {
  const { groupId, expenseId } = event.params
  const expense = event.data?.data()
  if (!expense) return

  // Write to feed
  const activityRef = db.collection(`groups/${groupId}/activity`).doc()
  await activityRef.set({
    actorUid: expense.createdBy,
    type: 'expense_added',
    createdAt: FieldValue.serverTimestamp(),
    metadata: {
      title: expense.description,
      amount: expense.amount,
      expenseId: expenseId,
    },
  })

  // Get group info for notification
  const groupSnap = await db.collection('groups').doc(groupId).get()
  const groupName = groupSnap.data()?.name ?? 'apna trip'
  const memberIds = (groupSnap.data()?.memberIds ?? []) as string[]

  // Fetch payer name
  const payerSnap = await db.collection('users').doc(expense.paidBy).get()
  const payerName = payerSnap.data()?.name?.split(' ')[0] ?? 'Someone'

  // Fetch fcmTokens for group members (except payer/creator)
  const notificationTargets = memberIds.filter(uid => uid !== expense.paidBy)
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
          body: `${payerName} added "${expense.description}": ₹${expense.amount}`,
        },
        data: {
          groupId,
          expenseId,
          type: 'expense_added',
        },
      })
    } catch (err) {
      console.error('Error sending multicast FCM notification:', err)
    }
  }
}

// Writes a deleted activity feed item using trip_event type to comply with Zod schemas.
export async function writeExpenseDeletedActivity(
  event: FirestoreEvent<any, { groupId: string; expenseId: string }>
): Promise<void> {
  const { groupId } = event.params
  
  // Write to feed
  const activityRef = db.collection(`groups/${groupId}/activity`).doc()
  await activityRef.set({
    actorUid: 'system', // System event for deletion
    type: 'trip_event',
    createdAt: FieldValue.serverTimestamp(),
    metadata: {
      title: 'An expense was deleted',
    },
  })
}

