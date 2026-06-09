// src/stores/itinerary.store.ts
// Zustand itinerary state.
//
// STATE SHAPE:
//   dayPlans:   DayPlan[]       — all days for active group, sorted by date
//   itemsByDay: Record<dayId, ItineraryItem[]>  — items per day, sorted by sortOrder
//
// OPTIMISTIC UPDATE PATTERN:
//   1. Apply change to local state immediately
//   2. Fire Firestore write
//   3. On error: rollback to previous state + set error message
//   Real-time subscriptions will eventually reconcile any discrepancy.
//
// SUBSCRIPTION MANAGEMENT:
//   Store holds unsubscribe refs. Call unsubscribeAll() on group change.

import { create } from 'zustand'
import type {
  DayPlan,
  DayPlanInput,
  ItineraryItem,
} from '../lib/schemas'
import {
  subscribeToDayPlans,
  subscribeToDayItems,
  upsertDayPlan,
  addItineraryItem,
  updateItineraryItem,
  deleteItineraryItem,
  reorderItems,
  moveItemToDay,
  voteOnItem,
} from '../lib/firebase/itinerary'
import { SORT_ORDER } from '../lib/schemas/itinerary.schema'
import { captureError } from '../lib/sentry'
import { track } from '../lib/analytics'
import type { Unsubscribe } from 'firebase/firestore'

interface ItineraryStore {
  // ── State ────────────────────────────────────────────────────────
  dayPlans:     DayPlan[]
  itemsByDay:   Record<string, ItineraryItem[]>
  activeDayId:  string | null          // Currently viewed day
  isLoading:    boolean
  isMutating:   boolean
  error:        string | null

  // ── Subscription management ──────────────────────────────────────
  subscribeToGroup:  (groupId: string) => void
  subscribeToDay:    (groupId: string, dayId: string) => void
  unsubscribeAll:    () => void

  // ── Day plan actions ─────────────────────────────────────────────
  createDay:    (groupId: string, input: DayPlanInput) => Promise<string>
  setActiveDay: (dayId: string | null) => void

  // ── Item actions ─────────────────────────────────────────────────
  addItem:     (groupId: string, dayId: string,
                input: Omit<ItineraryItem, 'id' | 'dayId' | 'groupId' | 'createdAt' | 'updatedAt' | 'addedByUid'>,
                addedByUid: string) => Promise<string>
  updateItem:  (groupId: string, dayId: string, itemId: string,
                updates: Partial<ItineraryItem>) => Promise<void>
  deleteItem:  (groupId: string, dayId: string, itemId: string) => Promise<void>
  reorderDay:  (groupId: string, dayId: string, newOrder: string[]) => Promise<void>
  moveItem:    (groupId: string, fromDayId: string, toDayId: string,
                item: ItineraryItem, targetIndex: number) => Promise<void>
  vote:        (groupId: string, dayId: string, itemId: string,
                uid: string, vote: 'up' | 'down') => Promise<void>

  // ── Helpers ──────────────────────────────────────────────────────
  setError:  (error: string | null) => void
  reset:     () => void
}

// Subscription registry — keyed by subscription type
let _groupUnsub:  Unsubscribe | null = null
const _dayUnsubs: Map<string, Unsubscribe> = new Map()

const initialState = {
  dayPlans:    [] as DayPlan[],
  itemsByDay:  {} as Record<string, ItineraryItem[]>,
  activeDayId: null as string | null,
  isLoading:   false,
  isMutating:  false,
  error:       null as string | null,
}

export const useItineraryStore = create<ItineraryStore>((set, get) => ({
  ...initialState,

  // ── Subscriptions ─────────────────────────────────────────────────

  subscribeToGroup: (groupId) => {
    // Unsubscribe existing group subscription before creating new
    _groupUnsub?.()
    _groupUnsub = subscribeToDayPlans(
      groupId,
      (plans) => set({ dayPlans: plans, isLoading: false }),
      (err)   => set({ error: err.message, isLoading: false }),
    )
    set({ isLoading: true })
  },

  subscribeToDay: (groupId, dayId) => {
    // Skip if already subscribed to this day
    if (_dayUnsubs.has(dayId)) return

    const unsub = subscribeToDayItems(
      groupId,
      dayId,
      (items) => set(state => ({
        itemsByDay: { ...state.itemsByDay, [dayId]: items },
      })),
      (err) => set({ error: err.message }),
    )
    _dayUnsubs.set(dayId, unsub)
  },

  unsubscribeAll: () => {
    _groupUnsub?.()
    _groupUnsub = null
    _dayUnsubs.forEach(unsub => unsub())
    _dayUnsubs.clear()
  },

  // ── Day actions ────────────────────────────────────────────────────

  createDay: async (groupId, input) => {
    set({ isMutating: true, error: null })
    try {
      const dayId = await upsertDayPlan(groupId, input)
      track('itinerary_day_created', { groupId, date: input.date })
      return dayId
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create day.'
      captureError(err, { source: 'itinerary.store.createDay' })
      set({ error: msg })
      throw err
    } finally {
      set({ isMutating: false })
    }
  },

  setActiveDay: (dayId) => set({ activeDayId: dayId }),

  // ── Item actions ───────────────────────────────────────────────────

  addItem: async (groupId, dayId, input, addedByUid) => {
    // Optimistic: compute sortOrder + insert locally
    const items    = get().itemsByDay[dayId] ?? []
    const last     = items[items.length - 1]
    const newOrder = last
      ? SORT_ORDER.afterLast(last.sortOrder)
      : SORT_ORDER.initial(0)

    const tempId = `temp_${Date.now()}`
    const optimistic: ItineraryItem = {
      ...input,
      id:          tempId,
      dayId,
      groupId,
      addedByUid,
      sortOrder:   newOrder,
      createdAt:   null as any,
      updatedAt:   null as any,
    }

    set(state => ({
      itemsByDay: {
        ...state.itemsByDay,
        [dayId]: [...(state.itemsByDay[dayId] ?? []), optimistic],
      },
    }))

    try {
      const realId = await addItineraryItem(groupId, dayId, {
        ...input,
        sortOrder: newOrder,
      }, addedByUid)

      // Replace temp item with real ID — real-time subscription will reconcile
      track('itinerary_item_added', { category: input.category, hasPlace: !!input.placeRef })
      return realId
    } catch (err) {
      // Rollback: remove temp item
      set(state => ({
        itemsByDay: {
          ...state.itemsByDay,
          [dayId]: (state.itemsByDay[dayId] ?? []).filter(i => i.id !== tempId),
        },
        error: 'Failed to add item.',
      }))
      captureError(err, { source: 'itinerary.store.addItem' })
      throw err
    }
  },

  updateItem: async (groupId, dayId, itemId, updates) => {
    // Optimistic update
    const prev = get().itemsByDay[dayId] ?? []
    set(state => ({
      itemsByDay: {
        ...state.itemsByDay,
        [dayId]: (state.itemsByDay[dayId] ?? []).map(i =>
          i.id === itemId ? { ...i, ...updates } : i
        ),
      },
    }))

    try {
      await updateItineraryItem(groupId, dayId, itemId, updates)
    } catch (err) {
      // Rollback
      set(state => ({ itemsByDay: { ...state.itemsByDay, [dayId]: prev } }))
      captureError(err, { source: 'itinerary.store.updateItem' })
      throw err
    }
  },

  deleteItem: async (groupId, dayId, itemId) => {
    const prev = get().itemsByDay[dayId] ?? []
    // Optimistic remove
    set(state => ({
      itemsByDay: {
        ...state.itemsByDay,
        [dayId]: (state.itemsByDay[dayId] ?? []).filter(i => i.id !== itemId),
      },
    }))

    try {
      await deleteItineraryItem(groupId, dayId, itemId)
      track('itinerary_item_deleted', {})
    } catch (err) {
      set(state => ({ itemsByDay: { ...state.itemsByDay, [dayId]: prev } }))
      captureError(err, { source: 'itinerary.store.deleteItem' })
      throw err
    }
  },

  reorderDay: async (groupId, dayId, newOrder) => {
    const items = get().itemsByDay[dayId] ?? []

    // Build new sortOrders spaced at INITIAL_GAP
    const sortOrders = newOrder.map((_, i) => SORT_ORDER.initial(i))

    // Optimistic: reorder local state
    const reordered = newOrder
      .map((id, i) => {
        const item = items.find(it => it.id === id)
        return item ? { ...item, sortOrder: sortOrders[i] } : null
      })
      .filter(Boolean) as ItineraryItem[]

    set(state => ({
      itemsByDay: { ...state.itemsByDay, [dayId]: reordered },
    }))

    try {
      await reorderItems(groupId, dayId, newOrder, sortOrders)
    } catch (err) {
      // Rollback
      set(state => ({ itemsByDay: { ...state.itemsByDay, [dayId]: items } }))
      captureError(err, { source: 'itinerary.store.reorderDay' })
      throw err
    }
  },

  moveItem: async (groupId, fromDayId, toDayId, item, targetIndex) => {
    const toItems   = get().itemsByDay[toDayId] ?? []
    const before    = toItems[targetIndex - 1]?.sortOrder ?? 0
    const after     = toItems[targetIndex]?.sortOrder
      ?? SORT_ORDER.afterLast(toItems[toItems.length - 1]?.sortOrder ?? 0)
    const newSortOrder = SORT_ORDER.between(before, after)

    // Optimistic: remove from source, add to dest
    set(state => ({
      itemsByDay: {
        ...state.itemsByDay,
        [fromDayId]: (state.itemsByDay[fromDayId] ?? []).filter(i => i.id !== item.id),
        [toDayId]:   [...toItems, { ...item, dayId: toDayId, sortOrder: newSortOrder }]
          .sort((a, b) => a.sortOrder - b.sortOrder),
      },
    }))

    try {
      await moveItemToDay(groupId, fromDayId, toDayId, item, newSortOrder)
      track('itinerary_item_moved', { fromDayId, toDayId })
    } catch (err) {
      // Rollback — re-fetch from subscriptions will correct state
      captureError(err, { source: 'itinerary.store.moveItem' })
      throw err
    }
  },

  vote: async (groupId, dayId, itemId, uid, vote) => {
    // Optimistic toggle
    set(state => ({
      itemsByDay: {
        ...state.itemsByDay,
        [dayId]: (state.itemsByDay[dayId] ?? []).map(i => {
          if (i.id !== itemId) return i
          const isUp = vote === 'up'
          const wasVoted = i.votes[vote].includes(uid)
          const newUp = isUp
            ? (wasVoted ? i.votes.up.filter(u => u !== uid) : [...i.votes.up, uid])
            : i.votes.up.filter(u => u !== uid)
          const newDown = !isUp
            ? (wasVoted ? i.votes.down.filter(u => u !== uid) : [...i.votes.down, uid])
            : i.votes.down.filter(u => u !== uid)

          return {
            ...i,
            votes: {
              up:   newUp,
              down: newDown,
            },
          }
        }),
      },
    }))

    try {
      await voteOnItem(groupId, dayId, itemId, uid, vote)
    } catch (err) {
      captureError(err, { source: 'itinerary.store.vote' })
      // Don't throw — vote failure is non-critical, subscription reconciles
    }
  },

  setError: (error) => set({ error }),
  reset:    () => {
    get().unsubscribeAll()
    set(initialState)
  },
}))
