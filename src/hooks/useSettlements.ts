// src/hooks/useSettlements.ts
// Group settlements hook + balance computation.
// This hook is the bridge between raw data and the balance engine.

import { useEffect, useMemo } from 'react'
import { useSettlementStore } from '@stores/settlement.store'
import { useExpenseStore } from '@stores/expense.store'
import { useGroupStore } from '@stores/group.store'
import { buildGroupBalanceSummary, getMyDebts, getOwedToMe, getMyNetBalance } from '@lib/engine/balanceEngine'
import type { RecordedSettlement } from '@lib/engine/balanceEngine'

export function useSettlements(groupId: string | null, myUid: string | null) {
  const store = useSettlementStore()
  const expensesByGroup = useExpenseStore(s => s.expensesByGroup)
  const activeGroup = useGroupStore(s => s.activeGroup)

  // Load settlements on mount
  useEffect(() => {
    if (groupId) store.loadSettlements(groupId)
  }, [groupId])

  const expenses = groupId ? (expensesByGroup[groupId] ?? []) : []
  const settlements = groupId ? (store.settlementsByGroup[groupId] ?? []) : []
  const memberIds = activeGroup?.memberIds ?? []

  // Convert SettlementRecord[] to RecordedSettlement[] for engine
  const recordedSettlements: RecordedSettlement[] = useMemo(
    () => settlements.map(s => ({
      fromUid: s.fromUid,
      toUid: s.toUid,
      amountPaise: s.amountPaise,
    })),
    [settlements],
  )

  // Build summary — memoized, only recomputes when data changes
  const summary = useMemo(
    () => buildGroupBalanceSummary(expenses, memberIds, recordedSettlements),
    [expenses, memberIds, recordedSettlements],
  )

  // My personal views
  const myDebts = useMemo(
    () => myUid ? getMyDebts(summary.debts, myUid) : [],
    [summary.debts, myUid],
  )

  const owedToMe = useMemo(
    () => myUid ? getOwedToMe(summary.debts, myUid) : [],
    [summary.debts, myUid],
  )

  const myBalance = useMemo(
    () => myUid ? getMyNetBalance(summary.balances, myUid) : null,
    [summary.balances, myUid],
  )

  return {
    summary,
    myDebts,
    owedToMe,
    myBalance,
    settlements,
    isLoading: store.isLoading,
    isSettling: store.isSettling,
    error: store.error,
    settleUp: store.settleUp,
  }
}
