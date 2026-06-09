// src/hooks/useBudget.ts
// Budget data hook — derived selectors over budget.store
// No component should access useBudgetStore directly — use this hook.

import { useEffect } from 'react'
import { useBudgetStore } from '@stores/budget.store'
import { recordPayment } from '@lib/firebase/settlements'
import { useAuthStore } from '@stores/auth.store'
import type { SettlementItem, BalanceItem, CategoryItem, BudgetItem } from '@lib/firebase/settlements'

export interface UseBudgetReturn {
  isLoading:      boolean
  error:          string | null
  balances:       BalanceItem[]
  pendingSettlements: SettlementItem[]
  recordedSettlements: SettlementItem[]
  categories:     CategoryItem[]
  budget:         BudgetItem | null
  expenseCount:   number
  totalSpentRupees: number
  totalBudgetRupees: number | null
  handleRecordPayment: (fromUid: string, toUid: string) => Promise<void>
}

export function useBudget(groupId: string): UseBudgetReturn {
  const subscribeGroup    = useBudgetStore((s) => s.subscribeGroup)
  const unsubscribeGroup  = useBudgetStore((s) => s.unsubscribeGroup)
  const settlementDoc     = useBudgetStore((s) => s.settlementDoc)
  const isLoading         = useBudgetStore((s) => s.isLoading)
  const error             = useBudgetStore((s) => s.error)
  const currentUser       = useAuthStore((s) => s.user)

  useEffect(() => {
    subscribeGroup(groupId)
    return () => unsubscribeGroup()
  }, [groupId])

  const handleRecordPayment = async (fromUid: string, toUid: string) => {
    if (!currentUser) return
    await recordPayment({
      groupId,
      fromUid,
      toUid,
      recordedBy: currentUser.uid,
    })
  }

  return {
    isLoading,
    error,
    balances:            settlementDoc?.balances ?? [],
    pendingSettlements:  settlementDoc?.settlements.filter((s) => s.status === 'pending') ?? [],
    recordedSettlements: settlementDoc?.settlements.filter((s) => s.status === 'recorded') ?? [],
    categories:          settlementDoc?.categories ?? [],
    budget:              settlementDoc?.budget ?? null,
    expenseCount:        settlementDoc?.expenseCount ?? 0,
    totalSpentRupees:    settlementDoc?.budget?.totalSpentPaise
                           ? settlementDoc.budget.totalSpentPaise / 100
                           : (settlementDoc?.balances.reduce((s, b) => s + b.totalPaid, 0) ?? 0) / 100,
    totalBudgetRupees:   settlementDoc?.budget?.totalBudgetPaise != null
                           ? settlementDoc.budget.totalBudgetPaise / 100
                           : null,
    handleRecordPayment,
  }
}
