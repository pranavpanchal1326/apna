// functions/src/computeSettlements.ts
// Cloud Function: onDocumentWritten — fires on expense create/update/delete
// Trigger: functions/expenses/{groupId}/expenses/{expenseId}
// Output: /groups/{groupId}/settlements/latest
//
// IDEMPOTENCY: Uses a Firestore transaction — safe to retry.
// PERFORMANCE: Fetches only non-deleted expenses. Target: <500ms for 200 expenses.

import * as functions from 'firebase-functions/v2'
import * as admin from 'firebase-admin'
import {
  computeBalances,
  simplifyDebts,
  categoryBreakdown,
  budgetUtilisation,
  type ExpenseShare,
} from '../../src/lib/engine/settlementEngine'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()

export const computeSettlements = functions.firestore.onDocumentWritten(
  {
    document:    'groups/{groupId}/expenses/{expenseId}',
    region:      'asia-south1',       // Mumbai — lowest latency for India
    memory:      '256MiB',
    timeoutSeconds: 30,
    minInstances: 0,
  },
  async (event) => {
    const { groupId } = event.params

    try {
      await db.runTransaction(async (tx) => {
        // 1. Fetch group document (for member list + budget)
        const groupRef  = db.doc(`groups/${groupId}`)
        const groupSnap = await tx.get(groupRef)

        if (!groupSnap.exists) {
          console.warn(`[computeSettlements] Group ${groupId} not found — skipping`)
          return
        }

        const group = groupSnap.data()!
        const memberIds: string[] = group.memberIds ?? []

        // 2. Fetch all members' display names + avatar colors
        const memberDocs = await Promise.all(
          memberIds.map((uid) => tx.get(db.doc(`users/${uid}`)))
        )

        const members = memberDocs
          .filter((d) => d.exists)
          .map((d) => ({
            uid:         d.id,
            name:        d.data()!.name as string,
            avatarColor: d.data()!.avatarColor as string,
          }))

        // 3. Fetch all non-deleted expenses for this group
        const expensesSnap = await db
          .collection(`groups/${groupId}/expenses`)
          .where('status', '!=', 'deleted')
          .get()

        // Map Firestore expenses → ExpenseShare objects (paise)
        const expenseShares: ExpenseShare[] = expensesSnap.docs.map((doc) => {
          const data = doc.data()
          return {
            payerUid: data.payerUid as string,
            shares: (data.splits as any[]).map((split: any) => ({
              uid:         split.uid as string,
              amountPaise: Math.round((split.amount as number) * 100),
            })),
          }
        })

        // Raw expenses for category + budget calculation
        const rawExpenses = expensesSnap.docs.map((doc) => {
          const data = doc.data()
          return {
            category:    data.category as string,
            amountPaise: Math.round((data.amount as number) * 100),
          }
        })

        // 4. Run settlement engine
        const balances    = computeBalances(expenseShares, members)
        const settlements = simplifyDebts(balances)
        const categories  = categoryBreakdown(rawExpenses)
        const budget      = group.totalBudget
          ? budgetUtilisation(group.totalBudget, rawExpenses)
          : null

        // 5. Write results to /groups/{groupId}/settlements/latest
        const settlementRef = db.doc(`groups/${groupId}/settlements/latest`)

        tx.set(settlementRef, {
          groupId,
          computedAt:  admin.firestore.FieldValue.serverTimestamp(),
          balances:    balances.map((b) => ({
            uid:         b.uid,
            displayName: b.displayName,
            avatarColor: b.avatarColor,
            netPaise:    b.netPaise,
            totalPaid:   b.totalPaid,
            totalOwed:   b.totalOwed,
          })),
          settlements: settlements.map((s) => ({
            fromUid:     s.fromUid,
            toUid:       s.toUid,
            fromName:    s.fromName,
            toName:      s.toName,
            amountPaise: s.amountPaise,
            status:      'pending',   // 'pending' | 'recorded'
          })),
          categories,
          budget,
          expenseCount: expensesSnap.size,
          memberCount:  members.length,
        })
      })

      console.log(`[computeSettlements] ✅ Group ${groupId} settlements updated`)
    } catch (err) {
      console.error(`[computeSettlements] ❌ Group ${groupId} failed:`, err)
      throw err  // Retry via Cloud Functions retry policy
    }
  }
)
