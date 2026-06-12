// src/stores/group.store.ts
// Zustand group state.
// Manages:
//   - List of user's groups (fetched on auth)
//   - Active group (currently viewed group)
//   - Group create / join / leave operations
//   - Loading + error state per operation
//
// Groups are fetched once on login and cached in memory.
// Real-time updates for the active group are handled in useGroups hook
// via Firestore onSnapshot (not here — store is for write ops + cache).

import { create } from 'zustand'
import type { GroupInput } from '@lib/schemas'
import {
  createGroup,
  joinGroupByCode,
  leaveGroup,
  fetchUserGroups,
  fetchGroup,
  type CreateGroupParams,
  type CreateGroupResult,
  type JoinGroupResult,
} from '@lib/firebase/groups'
import { captureError } from '@lib/sentry'
import { track } from '@lib/analytics'
import { processReferralQualification } from '@lib/firebase/referrals'
import { useAuthStore } from './auth.store'

interface GroupStore {
  // ── State ───────────────────────────────────────────────────────
  groups:       GroupInput[]
  activeGroup:  GroupInput | null
  isLoading:    boolean
  isCreating:   boolean
  isJoining:    boolean
  error:        string | null

  // ── Actions ─────────────────────────────────────────────────────
  loadGroups:   (groupIds: string[]) => Promise<void>
  setActiveGroup: (group: GroupInput | null) => void
  refreshActiveGroup: (groupId: string) => Promise<void>

  createGroup:  (params: CreateGroupParams) => Promise<CreateGroupResult>
  joinGroup:    (code: string, uid: string) => Promise<JoinGroupResult>
  leaveGroup:   (groupId: string, uid: string) => Promise<void>
  updateGroupInCache: (updated: GroupInput) => void

  setError:     (error: string | null) => void
  reset:        () => void
}

export const useGroupStore = create<GroupStore>((set) => ({
  // ── Initial state ─────────────────────────────────────────────
  groups:       [],
  activeGroup:  null,
  isLoading:    false,
  isCreating:   false,
  isJoining:    false,
  error:        null,

  // ── Load all user groups ──────────────────────────────────────
  loadGroups: async (groupIds) => {
    if (groupIds.length === 0) {
      set({ groups: [], isLoading: false })
      return
    }
    set({ isLoading: true, error: null })
    try {
      const groups = await fetchUserGroups(groupIds)
      set({ groups, isLoading: false })
    } catch (err) {
      captureError(err, { source: 'group.store.loadGroups' })
      set({ isLoading: false, error: 'Failed to load groups.' })
    }
  },

  setActiveGroup: (group) => set({ activeGroup: group }),

  refreshActiveGroup: async (groupId) => {
    try {
      const group = await fetchGroup(groupId)
      if (group) {
        set({ activeGroup: group })
        // Update in list cache too
        set((state) => ({
          groups: state.groups.map((g) => (g.id === groupId ? group : g)),
        }))
      }
    } catch (err) {
      captureError(err, { source: 'group.store.refreshActiveGroup' })
    }
  },

  // ── Create group ──────────────────────────────────────────────
  createGroup: async (params) => {
    set({ isCreating: true, error: null })
    try {
      const result = await createGroup(params)

      // Optimistically add to local list
      const newGroup = await fetchGroup(result.groupId)
      if (newGroup) {
        set((state) => ({ groups: [newGroup, ...state.groups] }))
      }

      // Synchronize group list in auth store
      const authUser = useAuthStore.getState().user
      if (authUser) {
        useAuthStore.getState().setUser({
          ...authUser,
          groups: [...(authUser.groups || []), result.groupId],
        })
      }

      track('group_created', {
        currency:     params.currency ?? 'INR',
        has_dates:    Boolean(params.startDate),
        has_budget:   Boolean(params.totalBudget),
      })

      track('referral_group_joined', { method: 'create' })
      void processReferralQualification(result.groupId)

      set({ isCreating: false })
      return result
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create group.'
      captureError(err, { source: 'group.store.createGroup' })
      set({ isCreating: false, error: msg })
      throw err
    }
  },

  // ── Join group ────────────────────────────────────────────────
  joinGroup: async (code, uid) => {
    set({ isJoining: true, error: null })
    try {
      const result = await joinGroupByCode(code, uid)

      // Fetch and add the joined group to local list
      const group = await fetchGroup(result.groupId)
      if (group) {
        set((state) => ({
          groups: state.groups.some((g) => g.id === result.groupId)
            ? state.groups
            : [group, ...state.groups],
        }))
      }

      // Synchronize group list in auth store
      const authUser = useAuthStore.getState().user
      if (authUser) {
        useAuthStore.getState().setUser({
          ...authUser,
          groups: [...(authUser.groups || []), result.groupId],
        })
      }

      track('group_joined', { method: 'invite_code' })
      track('referral_group_joined', { method: 'join' })
      void processReferralQualification(result.groupId)

      set({ isJoining: false })
      return result
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to join group.'
      captureError(err, { source: 'group.store.joinGroup' })
      set({ isJoining: false, error: msg })
      throw err
    }
  },

  // ── Leave group ───────────────────────────────────────────────
  leaveGroup: async (groupId, uid) => {
    set({ isLoading: true, error: null })
    try {
      await leaveGroup(groupId, uid)
      set((state) => ({
        groups:      state.groups.filter((g) => g.id !== groupId),
        activeGroup: state.activeGroup?.id === groupId ? null : state.activeGroup,
        isLoading:   false,
      }))

      // Synchronize group list in auth store
      const authUser = useAuthStore.getState().user
      if (authUser) {
        useAuthStore.getState().setUser({
          ...authUser,
          groups: (authUser.groups || []).filter((id) => id !== groupId),
        })
      }

      track('group_left')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to leave group.'
      captureError(err, { source: 'group.store.leaveGroup' })
      set({ isLoading: false, error: msg })
      throw err
    }
  },

  // ── Update group in cache (called after real-time update) ─────
  updateGroupInCache: (updated) => {
    set((state) => ({
      groups: state.groups.map((g) => (g.id === updated.id ? updated : g)),
      activeGroup:
        state.activeGroup?.id === updated.id ? updated : state.activeGroup,
    }))
  },

  setError: (error) => set({ error }),

  reset: () =>
    set({
      groups:      [],
      activeGroup: null,
      isLoading:   false,
      isCreating:  false,
      isJoining:   false,
      error:       null,
    }),
}))
