// src/stores/hangout.store.ts
// Zustand store for Hangout Planner.
//
// STATE SHAPE:
//   hangouts: Hangout[]  — all hangouts for active group, sorted by scheduledDate
//
// OPTIMISTIC UPDATES:
//   RSVP is applied optimistically so the UI is instant.
//   Real-time subscription reconciles any discrepancy.

import { create } from 'zustand'
import type { Hangout, HangoutCreate, HangoutUpdate, RsvpValue } from '../lib/schemas/hangout.schema'
import {
  createHangout,
  updateHangout,
  cancelHangout,
  castRsvp,
  subscribeToHangouts,
} from '../lib/firebase/hangouts'
import { captureError } from '../lib/sentry'
import { sortHangouts } from '../lib/utils/hangout'
import type { Unsubscribe } from 'firebase/firestore'

interface HangoutStore {
  // ── State ─────────────────────────────────────────────────────────
  hangouts:   Hangout[]
  isLoading:  boolean
  isMutating: boolean
  error:      string | null

  // ── Subscriptions ──────────────────────────────────────────────────
  subscribeToGroup: (groupId: string) => void
  unsubscribe:      () => void

  // ── Actions ────────────────────────────────────────────────────────
  proposeHangout: (groupId: string, input: HangoutCreate) => Promise<string>
  updateHangout:  (groupId: string, update: HangoutUpdate) => Promise<void>
  cancelHangout:  (groupId: string, hangoutId: string) => Promise<void>
  castRsvp:       (groupId: string, hangoutId: string, uid: string, value: RsvpValue) => Promise<void>
  clearError:     () => void
}

let _unsub: Unsubscribe | null = null

export const useHangoutStore = create<HangoutStore>((set, get) => ({
  hangouts:   [],
  isLoading:  false,
  isMutating: false,
  error:      null,

  // ── Subscriptions ──────────────────────────────────────────────────

  subscribeToGroup(groupId) {
    _unsub?.()
    set({ isLoading: true, hangouts: [] })

    _unsub = subscribeToHangouts(
      groupId,
      (hangouts) => set({ hangouts: [...hangouts].sort(sortHangouts), isLoading: false }),
      (err) => {
        captureError(err, { source: 'hangoutStore.subscribeToGroup', groupId })
        set({ isLoading: false, error: 'Failed to load hangouts.' })
      },
    )
  },

  unsubscribe() {
    _unsub?.()
    _unsub = null
    set({ hangouts: [], isLoading: false })
  },

  // ── Propose ────────────────────────────────────────────────────────

  async proposeHangout(groupId, input) {
    set({ isMutating: true, error: null })
    try {
      const hangoutId = await createHangout(groupId, input)
      set({ isMutating: false })
      return hangoutId
    } catch (err) {
      captureError(err as Error, { source: 'hangoutStore.proposeHangout' })
      set({ isMutating: false, error: 'Failed to propose hangout.' })
      throw err
    }
  },

  // ── Update ─────────────────────────────────────────────────────────

  async updateHangout(groupId, update) {
    const prev = get().hangouts
    set((s) => ({
      hangouts: s.hangouts.map((h) => h.id === update.id ? { ...h, ...update } : h),
    }))
    try {
      await updateHangout(groupId, update)
    } catch (err) {
      captureError(err as Error, { source: 'hangoutStore.updateHangout' })
      set({ hangouts: prev, error: 'Failed to update hangout.' })
      throw err
    }
  },

  // ── Cancel ─────────────────────────────────────────────────────────

  async cancelHangout(groupId, hangoutId) {
    const prev = get().hangouts
    set((s) => ({
      hangouts: s.hangouts.map((h) => h.id === hangoutId ? { ...h, status: 'canceled' } : h),
    }))
    try {
      await cancelHangout(groupId, hangoutId)
    } catch (err) {
      captureError(err as Error, { source: 'hangoutStore.cancelHangout' })
      set({ hangouts: prev, error: 'Failed to cancel hangout.' })
      throw err
    }
  },

  // ── RSVP ───────────────────────────────────────────────────────────

  async castRsvp(groupId, hangoutId, uid, value) {
    const currentHangout = get().hangouts.find((h) => h.id === hangoutId)
    if (!currentHangout) return

    // Optimistic update — apply RSVP + recompute counts immediately
    const prev = get().hangouts
    const prevRsvpValue = currentHangout.rsvps[uid]?.value ?? null

    let yesCount   = currentHangout.yesCount
    let maybeCount = currentHangout.maybeCount
    let noCount    = currentHangout.noCount

    if (prevRsvpValue === 'yes')   yesCount--
    if (prevRsvpValue === 'maybe') maybeCount--
    if (prevRsvpValue === 'no')    noCount--
    if (value === 'yes')   yesCount++
    if (value === 'maybe') maybeCount++
    if (value === 'no')    noCount++

    yesCount   = Math.max(0, yesCount)
    maybeCount = Math.max(0, maybeCount)
    noCount    = Math.max(0, noCount)

    const shouldConfirm =
      currentHangout.status === 'proposed' &&
      yesCount >= currentHangout.quorumThreshold

    set((s) => ({
      hangouts: s.hangouts.map((h) => {
        if (h.id !== hangoutId) return h
        return {
          ...h,
          rsvps: {
            ...h.rsvps,
            [uid]: { value, votedAt: null },
          },
          yesCount,
          maybeCount,
          noCount,
          status: shouldConfirm ? 'confirmed' : h.status,
        }
      }),
    }))

    try {
      await castRsvp(groupId, hangoutId, uid, value, currentHangout)
    } catch (err) {
      captureError(err as Error, { source: 'hangoutStore.castRsvp' })
      set({ hangouts: prev, error: 'Failed to submit RSVP.' })
      throw err
    }
  },

  clearError() {
    set({ error: null })
  },
}))
