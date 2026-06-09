// src/hooks/useExpenses.ts
// Group expenses hook — loads on mount, provides add/remove/update actions.

import { useEffect } from 'react'
import { useExpenseStore } from '@stores/expense.store'

export function useExpenses(groupId: string | null) {
  const store = useExpenseStore()

  useEffect(() => {
    if (groupId) store.loadExpenses(groupId)
  }, [groupId])

  const expenses = groupId
    ? (store.expensesByGroup[groupId] ?? [])
    : []

  return {
    expenses,
    isLoading:   store.isLoading,
    isAdding:    store.isAdding,
    error:       store.error,
    addExpense:  store.addExpense,
    removeExpense: store.removeExpense,
    updateExpenseItem: store.updateExpenseItem,
    receiptUploads: store.receiptUploads,
  }
}
