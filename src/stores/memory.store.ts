// src/stores/memory.store.ts
// Zustand store for Group Memories.
//
// STATE SHAPE:
//   memories: MemoryInput[]  — all memories for active group, sorted by date & createdAt
//
// OPTIMISTIC UPDATES:
//   Reactions are applied optimistically so the UI responds instantly.
//   Real-time subscription reconciles any discrepancy.

import { create } from 'zustand'
import type { MemoryInput, MemoryCreate } from '../lib/schemas/memory.schema'
import type { ReactionEmoji } from '../lib/types/memory.types'
import {
  addMemory as firebaseAddMemory,
  castMemoryReaction,
  removeMemoryReaction,
  subscribeToMemories,
} from '../lib/firebase/memories'
import { captureError } from '../lib/sentry'
import type { Unsubscribe } from 'firebase/firestore'

interface MemoryStore {
  // ── State ─────────────────────────────────────────────────────────
  memories:   MemoryInput[]
  isLoading:  boolean
  isMutating: boolean
  error:      string | null

  // ── Subscriptions ──────────────────────────────────────────────────
  subscribeToGroup: (groupId: string) => void
  unsubscribe:      () => void

  // ── Actions ────────────────────────────────────────────────────────
  addMemory:      (groupId: string, input: MemoryCreate) => Promise<string>
  castReaction:   (groupId: string, memoryId: string, userId: string, emoji: ReactionEmoji) => Promise<void>
  removeReaction: (groupId: string, memoryId: string, userId: string) => Promise<void>
  clearError:     () => void
}

let _unsub: Unsubscribe | null = null

export const useMemoryStore = create<MemoryStore>((set, get) => ({
  memories:   [],
  isLoading:  false,
  isMutating: false,
  error:      null,

  // ── Subscriptions ──────────────────────────────────────────────────

  subscribeToGroup(groupId) {
    _unsub?.()
    set({ isLoading: true, memories: [] })

    _unsub = subscribeToMemories(
      groupId,
      (memories) => set({ memories, isLoading: false }),
      (err) => {
        captureError(err, { source: 'memoryStore.subscribeToGroup', groupId })
        set({ isLoading: false, error: 'Failed to load memories.' })
      },
    )
  },

  unsubscribe() {
    _unsub?.()
    _unsub = null
    set({ memories: [], isLoading: false })
  },

  // ── Add Memory ─────────────────────────────────────────────────────

  async addMemory(groupId, input) {
    set({ isMutating: true, error: null })
    try {
      const memoryId = await firebaseAddMemory(groupId, input)
      set({ isMutating: false })
      return memoryId
    } catch (err) {
      captureError(err as Error, { source: 'memoryStore.addMemory' })
      set({ isMutating: false, error: 'Failed to post memory.' })
      throw err
    }
  },

  // ── Cast Reaction ──────────────────────────────────────────────────

  async castReaction(groupId, memoryId, userId, emoji) {
    const prev = get().memories
    const memory = prev.find((m) => m.id === memoryId)
    if (!memory) return

    // Optimistic update
    set((s) => ({
      memories: s.memories.map((m) => {
        if (m.id !== memoryId) return m
        const nextReactions = { ...(m.reactions || {}) }
        nextReactions[userId] = emoji
        return {
          ...m,
          reactions: nextReactions,
        }
      }),
    }))

    try {
      await castMemoryReaction(groupId, memoryId, userId, emoji)
    } catch (err) {
      captureError(err as Error, { source: 'memoryStore.castReaction' })
      set({ memories: prev, error: 'Failed to submit reaction.' })
      throw err
    }
  },

  // ── Remove Reaction ────────────────────────────────────────────────

  async removeReaction(groupId, memoryId, userId) {
    const prev = get().memories
    const memory = prev.find((m) => m.id === memoryId)
    if (!memory) return

    // Optimistic update
    set((s) => ({
      memories: s.memories.map((m) => {
        if (m.id !== memoryId) return m
        const nextReactions = { ...(m.reactions || {}) }
        delete nextReactions[userId]
        return {
          ...m,
          reactions: nextReactions,
        }
      }),
    }))

    try {
      await removeMemoryReaction(groupId, memoryId, userId)
    } catch (err) {
      captureError(err as Error, { source: 'memoryStore.removeReaction' })
      set({ memories: prev, error: 'Failed to remove reaction.' })
      throw err
    }
  },

  clearError() {
    set({ error: null })
  },
}))
