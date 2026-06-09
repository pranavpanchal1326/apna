// src/stores/budget.store.ts
// Zustand budget state — wraps settlement subscription + local UI state
// One store per app lifetime — resets on group switch.

import { create } from 'zustand'
import { subscribeToSettlements, type SettlementDoc } from '@lib/firebase/settlements'
import type { Unsubscribe } from 'firebase/firestore'

interface BudgetStore {
  // ── Data ────────────────────────────────────────────────────────
  settlementDoc:   SettlementDoc | null
  isLoading:       boolean
  error:           string | null
  activeGroupId:   string | null

  // ── Subscription ────────────────────────────────────────────────
  _unsubscribe:    Unsubscribe | null

  // ── Actions ─────────────────────────────────────────────────────
  subscribeGroup:  (groupId: string) => void
  unsubscribeGroup: () => void
  setSettlementDoc: (doc: SettlementDoc | null) => void
  setError:        (err: string | null) => void
}

export const useBudgetStore = create<BudgetStore>((set, get) => ({
  settlementDoc:  null,
  isLoading:      false,
  error:          null,
  activeGroupId:  null,
  _unsubscribe:   null,

  subscribeGroup: (groupId) => {
    const { _unsubscribe, activeGroupId } = get()

    // Already subscribed to this group — no-op
    if (activeGroupId === groupId && _unsubscribe) return

    // Unsubscribe previous group
    _unsubscribe?.()

    set({ isLoading: true, error: null, activeGroupId: groupId, settlementDoc: null })

    const unsub = subscribeToSettlements(
      groupId,
      (doc) => set({ settlementDoc: doc, isLoading: false }),
      (err) => set({ error: err.message, isLoading: false })
    )

    set({ _unsubscribe: unsub })
  },

  unsubscribeGroup: () => {
    get()._unsubscribe?.()
    set({
      _unsubscribe:  null,
      settlementDoc: null,
      activeGroupId: null,
      isLoading:     false,
      error:         null,
    })
  },

  setSettlementDoc: (doc) => set({ settlementDoc: doc }),
  setError:         (err) => set({ error: err }),
}))
