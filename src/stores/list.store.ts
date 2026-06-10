// src/stores/list.store.ts
// Zustand store for Shared Lists.
//
// STATE SHAPE:
//   lists:        SharedList[]       — active (non-archived) lists for active group
//   itemsByList:  Record<listId, SharedListItem[]>
//   activeListId: string | null
//
// OPTIMISTIC UPDATE PATTERN:
//   1. Apply change to local state immediately
//   2. Fire Firestore write
//   3. On error: rollback + set error message
//
// SUBSCRIPTION MANAGEMENT:
//   Call unsubscribeAll() when the active group changes.

import { create } from 'zustand'
import type { SharedList, SharedListItem, SharedListCreate, SharedListUpdate } from '../lib/schemas/list.schema'
import {
  subscribeToLists,
  subscribeToListItems,
  createList,
  updateList,
  archiveList,
  deleteList,
  addListItem,
  updateListItem,
  toggleListItem,
  claimListItem,
  deleteListItem,
  nextItemOrder,
} from '../lib/firebase/lists'
import { captureError } from '../lib/sentry'
import type { Unsubscribe } from 'firebase/firestore'

interface ListStore {
  // ── State ────────────────────────────────────────────────────────
  lists:        SharedList[]
  itemsByList:  Record<string, SharedListItem[]>
  activeListId: string | null
  isLoading:    boolean
  isMutating:   boolean
  error:        string | null

  // ── Subscriptions ─────────────────────────────────────────────────
  subscribeToGroup: (groupId: string) => void
  subscribeToList:  (groupId: string, listId: string) => void
  unsubscribeAll:   () => void

  // ── List actions ──────────────────────────────────────────────────
  setActiveList:  (listId: string | null) => void
  createList:     (groupId: string, input: SharedListCreate) => Promise<string>
  updateList:     (groupId: string, update: SharedListUpdate) => Promise<void>
  archiveList:    (groupId: string, listId: string) => Promise<void>
  deleteList:     (groupId: string, listId: string) => Promise<void>

  // ── Item actions ──────────────────────────────────────────────────
  addItem:    (groupId: string, listId: string, text: string, createdBy: string, opts?: { notes?: string; deadlineDate?: string }) => Promise<string>
  updateItem: (groupId: string, listId: string, update: { id: string; text?: string; notes?: string; deadlineDate?: string }) => Promise<void>
  toggleItem: (groupId: string, listId: string, itemId: string, checked: boolean, uid: string) => Promise<void>
  claimItem:  (groupId: string, listId: string, itemId: string, uid: string | null) => Promise<void>
  deleteItem: (groupId: string, listId: string, itemId: string) => Promise<void>

  // ── Misc ──────────────────────────────────────────────────────────
  clearError: () => void
}

// Internal unsubscribe refs
let _unsubLists: Unsubscribe | null = null
const _unsubItems: Record<string, Unsubscribe> = {}

export const useListStore = create<ListStore>((set, get) => ({
  lists:        [],
  itemsByList:  {},
  activeListId: null,
  isLoading:    false,
  isMutating:   false,
  error:        null,

  // ── Subscriptions ─────────────────────────────────────────────────

  subscribeToGroup(groupId) {
    // Unsubscribe previous group listener if any
    _unsubLists?.()
    set({ isLoading: true, lists: [], itemsByList: {}, activeListId: null })

    _unsubLists = subscribeToLists(
      groupId,
      (lists) => set({ lists, isLoading: false }),
      (err) => {
        captureError(err, { source: 'listStore.subscribeToGroup', groupId })
        set({ isLoading: false, error: 'Failed to load lists.' })
      },
    )
  },

  subscribeToList(groupId, listId) {
    // Avoid duplicate subscriptions
    if (_unsubItems[listId]) return

    _unsubItems[listId] = subscribeToListItems(
      groupId,
      listId,
      (items) => set((s) => ({
        itemsByList: { ...s.itemsByList, [listId]: items },
      })),
      (err) => {
        captureError(err, { source: 'listStore.subscribeToList', groupId, listId })
        set({ error: 'Failed to load list items.' })
      },
    )
  },

  unsubscribeAll() {
    _unsubLists?.()
    _unsubLists = null
    Object.values(_unsubItems).forEach((unsub) => unsub())
    Object.keys(_unsubItems).forEach((k) => { delete _unsubItems[k] })
    set({ lists: [], itemsByList: {}, activeListId: null, isLoading: false })
  },

  setActiveList(listId) {
    set({ activeListId: listId })
  },

  // ── List actions ──────────────────────────────────────────────────

  async createList(groupId, input) {
    set({ isMutating: true, error: null })
    try {
      const listId = await createList(groupId, input)
      set({ isMutating: false })
      return listId
    } catch (err) {
      captureError(err as Error, { source: 'listStore.createList' })
      set({ isMutating: false, error: 'Failed to create list.' })
      throw err
    }
  },

  async updateList(groupId, update) {
    // Optimistic update
    const prev = get().lists
    set((s) => ({
      lists: s.lists.map((l) => l.id === update.id ? { ...l, ...update } : l),
    }))
    try {
      await updateList(groupId, update)
    } catch (err) {
      captureError(err as Error, { source: 'listStore.updateList' })
      set({ lists: prev, error: 'Failed to update list.' })
      throw err
    }
  },

  async archiveList(groupId, listId) {
    const prev = get().lists
    set((s) => ({
      lists: s.lists.filter((l) => l.id !== listId),
    }))
    try {
      await archiveList(groupId, listId)
    } catch (err) {
      captureError(err as Error, { source: 'listStore.archiveList' })
      set({ lists: prev, error: 'Failed to archive list.' })
      throw err
    }
  },

  async deleteList(groupId, listId) {
    const prev = get().lists
    set((s) => ({
      lists: s.lists.filter((l) => l.id !== listId),
      activeListId: s.activeListId === listId ? null : s.activeListId,
    }))
    try {
      await deleteList(groupId, listId)
    } catch (err) {
      captureError(err as Error, { source: 'listStore.deleteList' })
      set({ lists: prev, error: 'Failed to delete list.' })
      throw err
    }
  },

  // ── Item actions ──────────────────────────────────────────────────

  async addItem(groupId, listId, text, createdBy, opts) {
    set({ isMutating: true, error: null })
    try {
      const currentItems = get().itemsByList[listId] ?? []
      const order = nextItemOrder(currentItems)
      const itemId = await addListItem(groupId, listId, {
        text,
        createdBy,
        checked: false,
        notes:        opts?.notes,
        deadlineDate: opts?.deadlineDate,
      }, order)
      set({ isMutating: false })
      return itemId
    } catch (err) {
      captureError(err as Error, { source: 'listStore.addItem' })
      set({ isMutating: false, error: 'Failed to add item.' })
      throw err
    }
  },

  async updateItem(groupId, listId, update) {
    const prev = get().itemsByList[listId] ?? []
    set((s) => ({
      itemsByList: {
        ...s.itemsByList,
        [listId]: (s.itemsByList[listId] ?? []).map((it) =>
          it.id === update.id ? { ...it, ...update } : it
        ),
      },
    }))
    try {
      await updateListItem(groupId, listId, update)
    } catch (err) {
      captureError(err as Error, { source: 'listStore.updateItem' })
      set((s) => ({ itemsByList: { ...s.itemsByList, [listId]: prev }, error: 'Failed to update item.' }))
      throw err
    }
  },

  async toggleItem(groupId, listId, itemId, checked, uid) {
    const prev = get().itemsByList[listId] ?? []
    set((s) => ({
      itemsByList: {
        ...s.itemsByList,
        [listId]: (s.itemsByList[listId] ?? []).map((it) =>
          it.id === itemId ? { ...it, checked } : it
        ),
      },
    }))
    try {
      await toggleListItem(groupId, listId, itemId, checked, uid)
    } catch (err) {
      captureError(err as Error, { source: 'listStore.toggleItem' })
      set((s) => ({ itemsByList: { ...s.itemsByList, [listId]: prev }, error: 'Failed to update item.' }))
      throw err
    }
  },

  async claimItem(groupId, listId, itemId, uid) {
    const prev = get().itemsByList[listId] ?? []
    set((s) => ({
      itemsByList: {
        ...s.itemsByList,
        [listId]: (s.itemsByList[listId] ?? []).map((it) =>
          it.id === itemId ? { ...it, claimedBy: uid ?? undefined } : it
        ),
      },
    }))
    try {
      await claimListItem(groupId, listId, itemId, uid)
    } catch (err) {
      captureError(err as Error, { source: 'listStore.claimItem' })
      set((s) => ({ itemsByList: { ...s.itemsByList, [listId]: prev }, error: 'Failed to claim item.' }))
      throw err
    }
  },

  async deleteItem(groupId, listId, itemId) {
    const prevItems = get().itemsByList[listId] ?? []
    const item = prevItems.find((it) => it.id === itemId)
    set((s) => ({
      itemsByList: {
        ...s.itemsByList,
        [listId]: (s.itemsByList[listId] ?? []).filter((it) => it.id !== itemId),
      },
    }))
    try {
      await deleteListItem(groupId, listId, itemId, item?.checked ?? false)
    } catch (err) {
      captureError(err as Error, { source: 'listStore.deleteItem' })
      set((s) => ({ itemsByList: { ...s.itemsByList, [listId]: prevItems }, error: 'Failed to delete item.' }))
      throw err
    }
  },

  clearError() {
    set({ error: null })
  },
}))
