// src/stores/expense.store.ts
// Zustand expense state.
// Per-group expense cache. Active group expenses loaded on GroupHome mount.
// Receipt upload state tracked separately (non-blocking UX).

import { create } from 'zustand'
import type { ExpenseInput } from '@lib/schemas'
import {
  createExpense,
  fetchExpensePage,
  deleteExpense,
  updateExpense,
  type CreateExpenseParams,
} from '@lib/firebase/expenses'
import { enqueueReceiptUpload } from '@lib/utils/receiptUploadQueue'
import { captureError } from '@lib/sentry'
import { track } from '@lib/analytics'

interface ReceiptUploadState {
  expenseId:  string
  percent:    number
  status:     'uploading' | 'done' | 'error'
}

interface ExpenseStore {
  // ── State ──────────────────────────────────────────────────────
  // Map of groupId → expense list
  expensesByGroup:   Record<string, ExpenseInput[]>
  isLoading:         boolean
  isAdding:          boolean
  error:             string | null
  receiptUploads:    ReceiptUploadState[]

  // ── Actions ───────────────────────────────────────────────────
  loadExpenses:      (groupId: string) => Promise<void>
  addExpense:        (params: CreateExpenseParams, receiptUri?: string) => Promise<string>
  removeExpense:     (groupId: string, expenseId: string) => Promise<void>
  updateExpenseItem: (groupId: string, expenseId: string, updates: Partial<ExpenseInput>) => Promise<void>
  setError:          (error: string | null) => void
  reset:             () => void
}

const initialState = {
  expensesByGroup: {},
  isLoading:       false,
  isAdding:        false,
  error:           null,
  receiptUploads:  [] as ReceiptUploadState[],
}

export const useExpenseStore = create<ExpenseStore>((set, get) => ({
  ...initialState,

  // ── Load expenses for a group ─────────────────────────────────
  loadExpenses: async (groupId) => {
    // Skip if already loaded
    if (get().expensesByGroup[groupId]) return
    set({ isLoading: true, error: null })

    try {
      const { expenses } = await fetchExpensePage(groupId)
      set((state) => ({
        expensesByGroup: { ...state.expensesByGroup, [groupId]: expenses },
        isLoading: false,
      }))
    } catch (err) {
      captureError(err, { source: 'expense.store.loadExpenses' })
      set({ isLoading: false, error: 'Failed to load expenses.' })
    }
  },

  // ── Add expense ───────────────────────────────────────────────
  addExpense: async (params, receiptUri) => {
    set({ isAdding: true, error: null })

    try {
      const expenseId = await createExpense(params)

      // Optimistic update — add to local list immediately
      const optimisticExpense: ExpenseInput = {
        id:           expenseId,
        groupId:      params.groupId,
        description:  params.description,
        amount:       params.amount,
        paidBy:       params.paidBy,
        splitType:    params.splitType,
        splits:       params.splits,
        category:     params.category,
        date:         params.date,
        notes:        params.notes,
        createdBy:    params.createdBy,
        isSettled:    false,
        currency:     'INR',
        createdAt:    new Date() as any, // Mock timestamp for local ordering
        receiptUrl:   params.receiptUrl,
      }

      set((state) => ({
        isAdding: false,
        expensesByGroup: {
          ...state.expensesByGroup,
          [params.groupId]: [
            optimisticExpense,
            ...(state.expensesByGroup[params.groupId] ?? []),
          ],
        },
      }))

      // Start non-blocking receipt upload if photo provided
      if (receiptUri) {
        enqueueReceiptUpload(params.groupId, expenseId, receiptUri)
      }

      track('expense_added', {
        category:    params.category,
        split_method: params.splitType,
        participant_count: Object.keys(params.splits).length,
        has_receipt: Boolean(receiptUri),
      })

      return expenseId
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add expense.'
      captureError(err, { source: 'expense.store.addExpense' })
      set({ isAdding: false, error: msg })
      throw err
    }
  },

  // ── Remove expense (soft delete) ─────────────────────────────
  removeExpense: async (groupId, expenseId) => {
    // Optimistic removal
    set((state) => ({
      expensesByGroup: {
        ...state.expensesByGroup,
        [groupId]: (state.expensesByGroup[groupId] ?? []).filter(
          (e) => e.id !== expenseId
        ),
      },
    }))

    try {
      await deleteExpense(groupId, expenseId)
      track('expense_deleted')
    } catch (err) {
      captureError(err, { source: 'expense.store.removeExpense' })
      // Rollback not implemented — reload from Firestore on next mount
    }
  },

  // ── Update expense ────────────────────────────────────────────
  updateExpenseItem: async (groupId, expenseId, updates) => {
    // Optimistic update
    set((state) => ({
      expensesByGroup: {
        ...state.expensesByGroup,
        [groupId]: (state.expensesByGroup[groupId] ?? []).map((e) =>
          e.id === expenseId ? { ...e, ...updates } : e
        ),
      },
    }))

    try {
      await updateExpense(groupId, expenseId, updates)
    } catch (err) {
      captureError(err, { source: 'expense.store.updateExpenseItem' })
      throw err
    }
  },

  setError: (error) => set({ error }),
  reset:    () => set(initialState),
}))
