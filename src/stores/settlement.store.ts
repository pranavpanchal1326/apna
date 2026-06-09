// src/stores/settlement.store.ts
// Zustand settlement state.
// Caches settlements per group.
// Triggers balance recalculation whenever expenses or settlements change.

import { create } from 'zustand'
import type { SettlementRecord, RecordSettlementParams } from '@lib/firebase/settlements'
import {
  recordSettlement,
  fetchGroupSettlements,
} from '@lib/firebase/settlements'
import { captureError } from '@lib/sentry'
import { track } from '@lib/analytics'

interface SettlementStore {
  // State
  settlementsByGroup: Record<string, SettlementRecord[]>
  isLoading: boolean
  isSettling: boolean
  error: string | null

  // Actions
  loadSettlements: (groupId: string) => Promise<void>
  settleUp: (params: RecordSettlementParams) => Promise<string>
  setError: (error: string | null) => void
  reset: () => void
}

const initialState = {
  settlementsByGroup: {} as Record<string, SettlementRecord[]>,
  isLoading: false,
  isSettling: false,
  error: null,
}

export const useSettlementStore = create<SettlementStore>((set, get) => ({
  ...initialState,

  loadSettlements: async (groupId) => {
    // Skip if already loaded — re-fetch on next mount
    if (get().settlementsByGroup[groupId]) return
    set({ isLoading: true, error: null })
    try {
      const settlements = await fetchGroupSettlements(groupId)
      set(state => ({
        settlementsByGroup: { ...state.settlementsByGroup, [groupId]: settlements },
        isLoading: false,
      }))
    } catch (err) {
      captureError(err, { source: 'settlement.store.loadSettlements' })
      set({ isLoading: false, error: 'Failed to load settlements.' })
    }
  },

  settleUp: async (params) => {
    set({ isSettling: true, error: null })
    try {
      const settlementId = await recordSettlement(params)

      // Optimistically add to local list
      const optimistic: SettlementRecord = {
        id: settlementId,
        groupId: params.groupId,
        fromUid: params.fromUid,
        toUid: params.toUid,
        amountRupees: params.amountRupees,
        amountPaise: Math.round(params.amountRupees * 100),
        currency: params.currency ?? 'INR',
        note: params.note,
        expenseIds: params.expenseIds ?? [],
        createdAt: { toMillis: () => Date.now(), toDate: () => new Date() } as any,
        createdBy: params.fromUid,
      }

      set(state => ({
        isSettling: false,
        settlementsByGroup: {
          ...state.settlementsByGroup,
          [params.groupId]: [
            optimistic,
            ...(state.settlementsByGroup[params.groupId] ?? []),
          ],
        },
      }))

      track('settlement_recorded', {
        amount: params.amountRupees,
        currency: params.currency ?? 'INR',
        has_note: Boolean(params.note),
      })

      return settlementId
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to record settlement.'
      captureError(err, { source: 'settlement.store.settleUp' })
      set({ isSettling: false, error: msg })
      throw err
    }
  },

  setError: (error) => set({ error }),
  reset: () => set(initialState),
}))
