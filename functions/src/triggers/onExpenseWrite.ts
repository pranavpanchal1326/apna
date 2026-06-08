// functions/src/triggers/onExpenseWrite.ts
import * as admin from 'firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import { FirestoreEvent } from 'firebase-functions/v2/firestore'

const db = admin.firestore()

interface Expense {
  id: string
  description: string
  amount: number
  paidBy: string
  splits: Record<string, number>
  createdBy: string
  isSettled: boolean
}

interface SettlementBalance {
  fromUid: string
  toUid: string
  amount: number
}

// Recalculates group balances and updates the group document.
export async function recalculateGroupBalances(groupId: string): Promise<void> {
  const groupRef = db.collection('groups').doc(groupId)
  const groupSnap = await groupRef.get()
  if (!groupSnap.exists) {
    console.error(`Group ${groupId} does not exist`)
    return
  }

  const groupData = groupSnap.data()
  const memberIds = (groupData?.memberIds ?? []) as string[]

  // Fetch all unsettled expenses
  const expensesSnap = await db.collection(`groups/${groupId}/expenses`).get()
  const expenses: Expense[] = []
  expensesSnap.forEach((doc) => {
    const data = doc.data()
    expenses.push({
      id: doc.id,
      description: data.description,
      amount: data.amount,
      paidBy: data.paidBy,
      splits: data.splits ?? {},
      createdBy: data.createdBy,
      isSettled: !!data.isSettled,
    })
  })

  // Recalculate net balances for all members
  const netBalances = calculateNetBalances(expenses, memberIds)
  const settlements = calculateSettlements(netBalances)

  // Update balances field on group
  await groupRef.update({
    balances: settlements,
  })

  console.info(`Recalculated balances for group ${groupId}:`, settlements)
}

function calculateNetBalances(
  expenses: Expense[],
  memberIds: string[],
): Record<string, number> {
  const balances: Record<string, number> = {}
  memberIds.forEach((id) => {
    balances[id] = 0
  })

  expenses.forEach((expense) => {
    if (balances[expense.paidBy] !== undefined) {
      balances[expense.paidBy] += expense.amount
    }
    Object.entries(expense.splits).forEach(([userId, share]) => {
      if (balances[userId] !== undefined) {
        balances[userId] -= share
      }
    })
  })

  Object.keys(balances).forEach((id) => {
    balances[id] = Math.round(balances[id] * 100) / 100
  })

  return balances
}

function calculateSettlements(
  netBalances: Record<string, number>,
): SettlementBalance[] {
  const EPSILON = 0.01

  const creditors = Object.entries(netBalances)
    .filter(([, amt]) => amt > EPSILON)
    .map(([userId, amount]) => ({ userId, amount }))
    .sort((a, b) => b.amount - a.amount)

  const debtors = Object.entries(netBalances)
    .filter(([, amt]) => amt < -EPSILON)
    .map(([userId, amount]) => ({ userId, amount: Math.abs(amount) }))
    .sort((a, b) => b.amount - a.amount)

  const settlements: SettlementBalance[] = []
  let ci = 0
  let di = 0

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci]
    const debtor = debtors[di]

    const transfer = Math.min(creditor.amount, debtor.amount)

    if (transfer > EPSILON) {
      settlements.push({
        fromUid: debtor.userId,
        toUid:   creditor.userId,
        amount:  Math.round(transfer * 100) / 100,
      })
    }

    creditor.amount -= transfer
    debtor.amount -= transfer

    if (creditor.amount < EPSILON) ci++
    if (debtor.amount < EPSILON) di++
  }

  return settlements
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

