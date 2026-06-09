// src/hooks/useBalances.ts
// Balance hook — computes paise-based balances from expense cache using
// the Prompt 1.5 calculateGroupBalances API.
//
// Also re-exports existing settlement data via useSettlements for backward compat.
// Recomputes automatically whenever expenses or members change.

import { useEffect, useMemo } from 'react'
import { useExpenseStore }     from '@stores/expense.store'
import { useGroupStore }       from '@stores/group.store'
import { useSettlementStore }  from '@stores/settlement.store'
import { useAuth }             from './useAuth'
import {
  calculateGroupBalances,
  getMemberBalanceSummary,
  type GroupBalances,
  type MemberBalanceSummary,
  type ExpenseForBalance,
} from '@lib/engine/balanceEngine'
import type { RecordSettlementParams } from '@lib/firebase/settlements'

export function useBalances(groupId: string | null) {
  const { user }        = useAuth()
  const activeGroup     = useGroupStore(s => s.activeGroup)
  const expensesByGroup = useExpenseStore(s => s.expensesByGroup)
  const store           = useSettlementStore()

  // Load settlements on mount
  useEffect(() => {
    if (groupId) store.loadSettlements(groupId)
  }, [groupId])   // intentionally exclude store from deps

  const expenses      = groupId ? (expensesByGroup[groupId] ?? []) : []
  const settlements   = groupId ? (store.settlementsByGroup[groupId] ?? []) : []
  const memberIds     = activeGroup?.memberIds ?? []

  // Convert existing expense format → ExpenseForBalance
  // The existing expense schema stores splits as { uid: rupeeAmount }
  // We convert to splitBetween: [{ uid, amountPaise }] for the new engine
  const expensesForBalance = useMemo((): ExpenseForBalance[] => {
    // First pass: regular expenses
    const fromExpenses: ExpenseForBalance[] = expenses.map(e => ({
      paidByUid: (e as any).paidBy ?? (e as any).paidByUid ?? '',
      splitBetween: Object.entries((e as any).splits ?? {}).map(
        ([uid, rupees]) => ({
          uid,
          amountPaise: Math.round((rupees as number) * 100),
        })
      ),
      status: (e as any).status ?? ((e as any).isSettled ? 'settled' : 'active'),
    }))

    // Second pass: settlements as reverse-entries
    const fromSettlements: ExpenseForBalance[] = settlements.map(s => ({
      paidByUid: s.fromUid,  // Debtor pays
      splitBetween: [
        { uid: s.toUid, amountPaise: s.amountPaise },
      ],
      status: 'active',
    }))

    return [...fromExpenses, ...fromSettlements]
  }, [expenses, settlements])

  // Compute group balances
  const groupBalances = useMemo((): GroupBalances | null => {
    if (!groupId || memberIds.length === 0) return null
    return calculateGroupBalances(expensesForBalance, memberIds)
  }, [groupId, expensesForBalance, memberIds])

  // Current user's personal summary
  const myBalance = useMemo((): MemberBalanceSummary | null => {
    if (!groupBalances || !user?.uid) return null
    return getMemberBalanceSummary(user.uid, groupBalances)
  }, [groupBalances, user?.uid])

  const settleUp = async (params: RecordSettlementParams) => {
    await store.settleUp(params)
  }

  return {
    groupBalances,
    myBalance,
    simplifiedDebts: groupBalances?.simplifiedDebts ?? [],
    isSettled:       groupBalances?.isSettled ?? false,
    isSettling:      store.isSettling,
    error:           store.error,
    settleUp,
  }
}
